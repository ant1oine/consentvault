FROM python:3.12-slim

WORKDIR /app

# Install build tools and dependencies for bcrypt
RUN apt-get update && apt-get install -y \
    build-essential \
    libffi-dev \
    python3-dev \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Force reinstall bcrypt and passlib to fix compatibility issues
RUN pip install --force-reinstall --no-cache-dir bcrypt==4.0.1 passlib[bcrypt]==1.7.4

COPY app ./app
COPY scripts ./scripts

COPY wait-for-db.sh /wait-for-db.sh
RUN chmod +x /wait-for-db.sh

ENV PORT=8000

ENTRYPOINT ["/wait-for-db.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

