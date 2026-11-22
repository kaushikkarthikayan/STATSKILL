"""Start-up setup for a hosted server (no shell needed). Safe to run on every start.

Creates the tables, loads the three courses (nothing is duplicated), and, only if ADMIN_EMAIL and
ADMIN_PASSWORD are set in the server's environment, creates that administrator once.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import import_ai_course  # noqa: E402
import import_sample_course  # noqa: E402
from calculus_topics import COURSE as CALC_COURSE  # noqa: E402
from calculus_topics import TOPICS as CALC_TOPICS  # noqa: E402

from app.db.setup import init_database  # noqa: E402
from app.services.accounts import ensure_admin  # noqa: E402


def main() -> int:
    init_database()
    import_sample_course.main()
    import_ai_course.main()
    import_ai_course.main(CALC_COURSE, CALC_TOPICS, prefix="CALC")
    email, password = os.getenv("ADMIN_EMAIL"), os.getenv("ADMIN_PASSWORD")
    if email and password:
        print(ensure_admin(email, os.getenv("ADMIN_NAME", "Administrator"), password))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())