"""Verify cryptographic signature of exported audit logs."""
import argparse
import base64
import hashlib
import sys
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError


def verify_signature(data_file: str, signature_file: str, public_key_file: str) -> bool:
    """Verify signature of exported audit log file."""
    try:
        # Read public key
        with open(public_key_file, "r") as f:
            pub_key_b64 = f.read().strip()
        verify_key = VerifyKey(base64.b64decode(pub_key_b64))

        # Read signature
        with open(signature_file, "r") as f:
            sig_b64 = f.read().strip()
        signature = base64.b64decode(sig_b64)

        # Read and hash data
        with open(data_file, "rb") as f:
            data = f.read()
        digest = hashlib.sha256(data).digest()

        # Verify signature
        try:
            verify_key.verify(digest, signature)
            print(f"✅ Verified: {data_file}")
            print(f"   Signature: {signature_file}")
            print(f"   Public key: {public_key_file}")
            return True
        except BadSignatureError:
            print(f"❌ Verification failed: {data_file}")
            print("   The file has been tampered with or the signature is invalid.")
            return False

    except FileNotFoundError as e:
        print(f"❌ Error: File not found - {e.filename}")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False


def main():
    """CLI entry point for signature verification."""
    parser = argparse.ArgumentParser(
        description="Verify cryptographic signature of exported audit logs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Verify a CSV export
  python scripts/verify_audit_signature.py \\
    audit_logs_2025-01-15T120000.csv \\
    audit_logs_2025-01-15T120000.csv.sig \\
    keys/audit_public.key

  # Verify a JSON export
  python scripts/verify_audit_signature.py \\
    audit_logs_2025-01-15T120000.json \\
    audit_logs_2025-01-15T120000.json.sig \\
    keys/audit_public.key
        """,
    )
    parser.add_argument(
        "data_file",
        help="Path to the exported audit log file (CSV or JSON)",
    )
    parser.add_argument(
        "signature_file",
        help="Path to the signature file (.sig)",
    )
    parser.add_argument(
        "public_key_file",
        nargs="?",
        default="keys/audit_public.key",
        help="Path to the public key file (default: keys/audit_public.key)",
    )

    args = parser.parse_args()

    success = verify_signature(args.data_file, args.signature_file, args.public_key_file)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

