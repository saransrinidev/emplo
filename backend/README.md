# HR Portal - Backend

FastAPI + SQLAlchemy + Alembic backend for the Employee & HR Portal.

## Stack

- Python / FastAPI
- SQLAlchemy 2.0 ORM
- Alembic migrations
- PostgreSQL (Supabase now, local Postgres later — just swap `DATABASE_URL`)

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env        # then edit DATABASE_URL + DB_SSL_MODE
```

For Supabase set `DB_SSL_MODE=require`. For local Postgres set `DB_SSL_MODE=disable`.

## Database migrations

```bash
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

## Seed default roles

```bash
python -m app.seed
```

## Data model

Core entities: `roles`, `users`, `employees`, `employee_addresses`, `documents`,
`certifications`, `salary_revisions`, `performance_reviews`,
`employee_edit_permissions`, `audit_logs`, plus `notifications`.

Notes:
- `users` (login) is separate from `employees` (HR record), linked via `users.employee_id`.
- `employees.manager_id` self-references to model the reporting hierarchy.
- "Current salary" is derived from the latest approved row in `salary_revisions`,
  not stored on the employee.
- Temporary edit access (`employee_edit_permissions`) is time-bounded via
  `start_at` / `expiry_at` and validated at request time.
```
