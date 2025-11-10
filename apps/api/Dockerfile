FROM python:3.12-slim

WORKDIR /app

# Install netcat for wait script
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

COPY wait-for-db.sh /wait-for-db.sh
RUN chmod +x /wait-for-db.sh

ENV PORT=8000

ENTRYPOINT ["/wait-for-db.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

