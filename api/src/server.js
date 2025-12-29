import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { makePool } from './db.js';
import { parseIntEnv, minutesToMs } from './util.js';
import { runSqlFile } from './migrate.js';

const PORT = parseIntEnv('PORT', 3000);
const APPOINTMENT_MINUTES = parseIntEnv('APPOINTMENT_MINUTES', 30);

const app = express();
app.use(cors());
app.use(express.json());

const pool = makePool();

async function initDb() {
  // schema + seed
  await runSqlFile(pool, './sql/schema.sql');
  // gen_random_uuid needs pgcrypto; attempt to enable
  try { await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;'); } catch {}
  await runSqlFile(pool, './sql/seed.sql');
}
await initDb();

app.get('/health', (req, res) => res.json({ ok: true }));

// Doctors
app.get('/api/doctors', async (req, res) => {
  const specialty = (req.query.specialty ?? '').toString().trim();
  const params = [];
  let where = 'WHERE activo = TRUE';
  if (specialty) {
    params.push(specialty);
    where += ` AND especialidad = $${params.length}`;
  }
  const q = `SELECT id, nombre, especialidad, activo FROM doctors ${where} ORDER BY especialidad, nombre`;
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Appointments list with filters
app.get('/api/appointments', async (req, res) => {
  const patient = (req.query.patient ?? '').toString().trim();
  const doctorId = (req.query.doctorId ?? '').toString().trim();
  const status = (req.query.status ?? '').toString().trim();
  const specialty = (req.query.specialty ?? '').toString().trim();
  const from = (req.query.from ?? '').toString().trim();
  const to = (req.query.to ?? '').toString().trim();

  const params = [];
  const where = [];

  if (patient) { params.push(`%${patient}%`); where.push(`a.paciente_nombre ILIKE $${params.length}`); }
  if (doctorId) { params.push(doctorId); where.push(`a.doctor_id = $${params.length}`); }
  if (status) { params.push(status); where.push(`a.status = $${params.length}::appointment_status`); }
  if (specialty) { params.push(specialty); where.push(`d.especialidad = $${params.length}`); }
  if (from) { params.push(from); where.push(`a.start_at >= $${params.length}::timestamptz`); }
  if (to) { params.push(to); where.push(`a.start_at < $${params.length}::timestamptz`); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const q = `
    SELECT a.id, a.paciente_nombre as "pacienteNombre", a.doctor_id as "medicoId",
           d.nombre as "medicoNombre", d.especialidad as "especialidad",
           a.start_at as "inicio", a.end_at as "fin", a.status as "estado", a.created_at as "createdAt"
    FROM appointments a
    JOIN doctors d ON d.id = a.doctor_id
    ${whereSql}
    ORDER BY a.start_at DESC
    LIMIT 1000;
  `;
  const { rows } = await pool.query(q, params);
  res.json(rows);
});

// Availability for a date (occupied slots)
app.get('/api/availability', async (req, res) => {
  const doctorId = (req.query.doctorId ?? '').toString().trim();
  const date = (req.query.date ?? '').toString().trim(); // YYYY-MM-DD
  if (!doctorId || !date) return res.status(400).json({ error: 'doctorId and date required' });

  // Use local day boundaries in UTC-03 assumption? Use date string as UTC day boundaries for simplicity.
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;

  const q = `
    SELECT start_at as "inicio", end_at as "fin", status as "estado"
    FROM appointments
    WHERE doctor_id = $1
      AND status <> 'CANCELADA'
      AND start_at >= $2::timestamptz
      AND start_at <= $3::timestamptz
    ORDER BY start_at;
  `;
  const { rows } = await pool.query(q, [doctorId, start, end]);
  res.json({ minutes: APPOINTMENT_MINUTES, occupied: rows });
});

// Create appointment with overlap validation
const CreateSchema = z.object({
  pacienteNombre: z.string().min(2),
  medicoId: z.string().uuid(),
  inicio: z.string().datetime(),
  // optional status
  estado: z.enum(['CONFIRMADA','REALIZADA','CANCELADA']).optional()
});

app.post('/api/appointments', async (req, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { pacienteNombre, medicoId, inicio } = parsed.data;
  const start = new Date(inicio);
  const end = new Date(start.getTime() + minutesToMs(APPOINTMENT_MINUTES));
  const estado = parsed.data.estado ?? 'CONFIRMADA';

  // overlap check
  const overlapQ = `
    SELECT 1
    FROM appointments
    WHERE doctor_id = $1
      AND status <> 'CANCELADA'
      AND start_at < $3::timestamptz
      AND end_at   > $2::timestamptz
    LIMIT 1;
  `;
  const { rowCount } = await pool.query(overlapQ, [medicoId, start.toISOString(), end.toISOString()]);
  if (rowCount > 0) return res.status(409).json({ error: 'SOLAPAMIENTO', message: 'La hora seleccionada ya está reservada para ese médico.' });

  const id = randomUUID();
  const insertQ = `
    INSERT INTO appointments (id, paciente_nombre, doctor_id, start_at, end_at, status)
    VALUES ($1,$2,$3,$4::timestamptz,$5::timestamptz,$6::appointment_status)
    RETURNING id;
  `;
  await pool.query(insertQ, [id, pacienteNombre, medicoId, start.toISOString(), end.toISOString(), estado]);
  res.status(201).json({ id });
});

// Update appointment (status or reschedule)
const PatchSchema = z.object({
  estado: z.enum(['CONFIRMADA','REALIZADA','CANCELADA']).optional(),
  inicio: z.string().datetime().optional()
});

app.patch('/api/appointments/:id', async (req, res) => {
  const id = req.params.id;
  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { rows: existingRows } = await pool.query('SELECT * FROM appointments WHERE id = $1', [id]);
  if (!existingRows.length) return res.status(404).json({ error: 'NOT_FOUND' });
  const existing = existingRows[0];

  const newStatus = parsed.data.estado ?? existing.status;
  let newStart = parsed.data.inicio ? new Date(parsed.data.inicio) : new Date(existing.start_at);
  let newEnd = new Date(newStart.getTime() + minutesToMs(APPOINTMENT_MINUTES));

  // if reschedule, check overlap excluding current id
  if (parsed.data.inicio) {
    const overlapQ = `
      SELECT 1
      FROM appointments
      WHERE doctor_id = $1
        AND id <> $2
        AND status <> 'CANCELADA'
        AND start_at < $4::timestamptz
        AND end_at   > $3::timestamptz
      LIMIT 1;
    `;
    const { rowCount } = await pool.query(overlapQ, [existing.doctor_id, id, newStart.toISOString(), newEnd.toISOString()]);
    if (rowCount > 0) return res.status(409).json({ error: 'SOLAPAMIENTO', message: 'La hora seleccionada ya está reservada para ese médico.' });
  }

  await pool.query(
    'UPDATE appointments SET status=$2::appointment_status, start_at=$3::timestamptz, end_at=$4::timestamptz WHERE id=$1',
    [id, newStatus, newStart.toISOString(), newEnd.toISOString()]
  );

  res.json({ ok: true });
});

// Stats
app.get('/api/appointments/stats', async (req, res) => {
  const group = (req.query.group ?? 'week').toString();
  const from = (req.query.from ?? '').toString();
  const to = (req.query.to ?? '').toString();

  const bucket = group === 'month' ? 'month' : 'week';
  const params = [];
  const where = [];

  if (from) { params.push(from); where.push(`start_at >= $${params.length}::timestamptz`); }
  if (to) { params.push(to); where.push(`start_at < $${params.length}::timestamptz`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const q = `
    SELECT date_trunc('${bucket}', start_at) AS bucket,
           COUNT(*)::int AS total,
           SUM(CASE WHEN status='CONFIRMADA' THEN 1 ELSE 0 END)::int AS confirmadas,
           SUM(CASE WHEN status='REALIZADA' THEN 1 ELSE 0 END)::int AS realizadas,
           SUM(CASE WHEN status='CANCELADA' THEN 1 ELSE 0 END)::int AS canceladas
    FROM appointments
    ${whereSql}
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 60;
  `;
  const { rows } = await pool.query(q, params);
  res.json({ group: bucket, rows });
});

app.listen(PORT, () => {
  console.log(`[api] listening on :${PORT}`);
});
