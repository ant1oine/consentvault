"""Generate Ed25519 keypair for audit log signing."""
import base64
import os
from nacl.signing import SigningKey


def main():
    """Generate Ed25519 keypair and save to keys/ directory."""
    key = SigningKey.generate()
    priv = base64.b64encode(key.encode()).decode()
    pub = base64.b64encode(key.verify_key.encode()).decode()

    os.makedirs("keys", exist_ok=True)
    with open("keys/audit_private.key", "w") as f:
        f.write(priv)
    with open("keys/audit_public.key", "w") as f:
        f.write(pub)

    print("✅ Generated Ed25519 keypair under ./keys/")
    print("   - Private key: keys/audit_private.key (keep secure!)")
    print("   - Public key:  keys/audit_public.key (share with auditors)")


if __name__ == "__main__":
    main()

