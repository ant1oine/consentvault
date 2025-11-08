#!/usr/bin/env python3
"""Generate a Fernet encryption key for MASTER_ENCRYPTION_KEY."""
from cryptography.fernet import Fernet

if __name__ == "__main__":
    key = Fernet.generate_key()
    print("Generated Fernet key (base64-encoded):")
    print(key.decode())
    print("\nAdd this to your .env file as MASTER_ENCRYPTION_KEY")


