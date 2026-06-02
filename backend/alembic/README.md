# Alembic migrations

Generate a new migration after changing models:

```
alembic revision --autogenerate -m "describe change"
```

Apply migrations:

```
alembic upgrade head
```

Roll back the last migration:

```
alembic downgrade -1
```

The database URL is read from `DATABASE_URL` in your `.env` (see `app/core/config.py`),
so the same commands work against Supabase or local Postgres just by swapping the URL.
