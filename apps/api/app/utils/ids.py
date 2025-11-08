import ulid

def generate_ulid() -> str:
    """Generate a ULID string compatible with Python 3.12."""
    return str(ulid.new())