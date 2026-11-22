"""Creates an administrator account, or promotes an existing account to administrator.

Run from the backend folder:
    .venv\\Scripts\\python.exe scripts\\create_admin.py

The password is typed hidden. It is never printed or written to a file.
"""

import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.setup import init_database  # noqa: E402
from app.services.accounts import ensure_admin  # noqa: E402


def main() -> int:
    init_database()
    email = input("Administrator email: ").strip()
    full_name = input("Full name: ").strip()
    if len(full_name) < 2 or "@" not in email:
        print("Please enter a valid name and email. Nothing was changed.")
        return 1
    password = getpass.getpass("Password (hidden; 8+ characters with a letter and a number): ")
    confirm = getpass.getpass("Confirm password (hidden): ")
    if password != confirm:
        print("The passwords do not match. Nothing was changed.")
        return 1
    try:
        print(ensure_admin(email, full_name, password))
    except ValueError as error:
        print(f"{error} Nothing was changed.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
