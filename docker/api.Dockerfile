FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[dev]"

# Explicitly ensure psycopg, alembic, and argon2-cffi are installed for migrations
RUN pip install --no-cache-dir psycopg[binary] alembic argon2-cffi

COPY . .

CMD ["uvicorn", "apps.api.app.main:app", "--host", "0.0.0.0", "--port", "8000"]


