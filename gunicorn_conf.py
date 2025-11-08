"""Gunicorn configuration for production."""
import multiprocessing
import os

bind = "0.0.0.0:8000"
workers = int(os.getenv("GUNICORN_WORKERS", str(multiprocessing.cpu_count())))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 60
graceful_timeout = 30
keepalive = 5
loglevel = os.getenv("LOG_LEVEL", "info")
accesslog = "-"
errorlog = "-"

