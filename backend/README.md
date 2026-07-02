# Emplo - Backend

FastAPI + SQLAlchemy backend for Emplo, backed by Supabase Postgres.

## Stack

- Python / FastAPI
- SQLAlchemy 2.0 ORM (UUID primary keys)
- JWT auth (python-jose) + bcrypt password hashing (passlib)
- PostgreSQL via Supabase (IPv4 Session pooler)

## Setup

Dependencies are installed in `.venv`. From the **workspace root**:

```bash
# 1. Create tables + seed roles (idempotent)
backend\.venv\Scripts\python.exe backend\scripts\init_db.py

# 2. Seed the initial HR admin account
backend\.venv\Scripts\python.exe backend\scripts\seed.py

# 3. Run the API server
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --app-dir backend
```


To wipe all data and re-seed a fresh HR admin: add `--reset`:

```bash
backend\.venv\Scripts\python.exe backend\scripts\seed.py --reset
```

Then open http://127.0.0.1:8000/docs

Default login (password `Secret123`): `saransrini@company.com` (hr_admin)

## Connection notes (Supabase)

The `.env` `DATABASE_URL` must use the **Session pooler** host, not the direct host:
- Direct `db.<ref>.supabase.co` is IPv6-only and fails on IPv4-only networks.
- Use `aws-1-<region>.pooler.supabase.com` (newer projects use the `aws-1` prefix).
- Prefix the URI with `postgresql+psycopg://` and URL-encode special chars in the
  password (`$` -> `%24`).
- Keep `DB_SSL_MODE=require`.

## Endpoints

| Method | Path                     | Roles            |
|--------|--------------------------|------------------|
| GET    | /health                  | public           |
| GET    | /health/db               | public           |
| POST   | /auth/register           | public           |
| POST   | /auth/login              | public           |
| POST   | /auth/refresh            | public           |
| POST   | /auth/logout             | public           |
| GET    | /auth/me                 | authenticated    |
| GET    | /employees               | manager, hr_admin |
| GET    | /employees/{id}          | authenticated (own record for employees) |
| POST   | /employees               | hr_admin         |
| PUT    | /employees/{id}          | hr_admin         |

## Tables

roles, users, employees, employee_addresses, emergency_contacts, documents,
certifications, salary_revisions, performance_reviews, employee_edit_permissions,
audit_logs.

Notes:
- `users` (login) is separate from `employees` (HR record), linked via `users.employee_id`.
- `employees.manager_id` self-references for the reporting hierarchy.
- "Current salary" is derived from the latest approved `salary_revisions` row.

## Project structure

```
backend/
  app/
    api/          FastAPI routers (one module per domain)
    core/         Config and security (JWT, password hashing)
    db/           SQLAlchemy engine, session, declarative base
    models/       ORM models (one file per table)
    schemas/      Pydantic request/response schemas
    main.py       App factory + router registration
    seed.py       Seeds the default roles
    seed_data.py  Seeds the initial HR admin account
  scripts/
    init_db.py    Create tables + seed roles
    seed.py       Seed HR admin (--reset to wipe first)
  uploads/        Uploaded files (gitignored except .gitkeep)
```
 