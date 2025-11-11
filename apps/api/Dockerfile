FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    python3-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --force-reinstall --no-cache-dir bcrypt==4.0.1 passlib[bcrypt]==1.7.4

# Copy the entire API folder (so migrations and alembic.ini are included)
COPY apps/api/ .

# Copy scripts directory from project root
COPY scripts ./scripts

# Copy the wait script from root/docker/
COPY docker/wait-for-db.sh /wait-for-db.sh
RUN chmod +x /wait-for-db.sh

ENV PORT=8000

ENTRYPOINT ["/wait-for-db.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
