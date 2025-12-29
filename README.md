# SaludPlus - Plataforma de Agendamiento (MVP)

Este repositorio contiene un **MVP funcional** para:
- Listado de médicos + especialidades
- Crear citas (paciente, médico, fecha/hora) con **validación de solape por médico**
- Historial de citas con estados (Confirmada, Realizada, Cancelada)
- Búsqueda por paciente o médico
- Agenda semanal (slots 30 min) con reservadas/disponibles
- Alertas visuales para citas próximas (snackbar)
- Estadísticas por semana/mes
- Filtros por estado, especialidad y rango de fechas
- Frontend Angular + Backend Express + PostgreSQL
- Docker + docker-compose

## Requisitos
- Docker y Docker Compose

## Levantar el stack
```bash
docker compose up --build
```

- Frontend: http://localhost:4200
- API: http://localhost:3000
- DB: postgres en localhost:5432 (user/pass/db = saludplus)

## Notas
- Duración de cita: **30 minutos**.
- La validación de solape se hace en backend (y el frontend consume disponibilidad del día).
- Para poblar médicos demo, el backend crea algunos en el arranque si la tabla está vacía.
