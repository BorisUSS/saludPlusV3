-- SaludPlus schema
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,
  especialidad TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM ('CONFIRMADA','REALIZADA','CANCELADA');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY,
  paciente_nombre TEXT NOT NULL,
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'CONFIRMADA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_start ON appointments(doctor_id, start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(paciente_nombre);
