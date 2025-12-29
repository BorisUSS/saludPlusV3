-- Seed demo doctors (only if table empty)
INSERT INTO doctors (id, nombre, especialidad, activo)
SELECT gen_random_uuid(), x.nombre, x.especialidad, TRUE
FROM (VALUES
  ('Dra. Camila Rojas', 'Medicina General'),
  ('Dr. Felipe Muñoz', 'Traumatología'),
  ('Dra. Antonia Pérez', 'Dermatología'),
  ('Dr. Martín Silva', 'Cardiología'),
  ('Dra. Javiera Soto', 'Pediatría')
) AS x(nombre, especialidad)
WHERE NOT EXISTS (SELECT 1 FROM doctors);
