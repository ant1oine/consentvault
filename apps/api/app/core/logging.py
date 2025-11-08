"""Structured logging configuration."""
import logging
import sys

import structlog


def configure_logging():
    """Configure structured logging with JSON output."""
    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)
    shared = [
        structlog.stdlib.add_log_level,
        timestamper,
        structlog.processors.JSONRenderer(),
    ]
    structlog.configure(
        processors=shared,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.stdlib.LoggerFactory(),
    )
    logging.basicConfig(stream=sys.stdout, level=logging.INFO)

