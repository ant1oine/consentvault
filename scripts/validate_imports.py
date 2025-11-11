#!/usr/bin/env python3
"""Validate that all imports in the API are clean."""
import os
import re
import sys

API_DIR = "apps/api/app"

# Allowed import patterns
ALLOWED_IMPORTS = {
    "app.config",
    "app.db",
    "app.deps",
    "app.schemas",
    "app.security",
    "app.routers",
}

# Standard library and third-party imports (allowed)
EXTERNAL_PATTERNS = [
    r"^from fastapi",
    r"^from sqlalchemy",
    r"^from pydantic",
    r"^from jose",
    r"^from passlib",
    r"^import ",
    r"^from datetime",
    r"^from uuid",
    r"^from typing",
    r"^from contextlib",
    r"^from io",
    r"^import csv",
    r"^import os",
    r"^import sys",
    r"^import re",
]

errors = []


def check_file(filepath):
    """Check a single file for invalid imports."""
    with open(filepath, "r") as f:
        for line_num, line in enumerate(f, 1):
            # Check for app.* imports
            match = re.search(r"from (app\.\w+)", line)
            if match:
                import_path = match.group(1)
                if import_path not in ALLOWED_IMPORTS:
                    errors.append(
                        f"{filepath}:{line_num} - Invalid import: {import_path}"
                    )


def main():
    """Main validation function."""
    print("🔍 Validating imports...")
    
    for root, dirs, files in os.walk(API_DIR):
        # Skip __pycache__
        dirs[:] = [d for d in dirs if d != "__pycache__"]
        
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                check_file(filepath)
    
    if errors:
        print("❌ Import validation failed:\n")
        for error in errors:
            print(f"  {error}")
        sys.exit(1)
    else:
        print("✅ All imports are clean!")
        print(f"\nAllowed imports: {', '.join(sorted(ALLOWED_IMPORTS))}")
        sys.exit(0)


if __name__ == "__main__":
    main()




