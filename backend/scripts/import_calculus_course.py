"""Adds the Engineering Mathematics: Calculus course (8 topics, notes, key points, 40 sample MCQs).

Run from the backend folder:
    .venv\\Scripts\\python.exe scripts\\import_calculus_course.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from calculus_topics import COURSE, TOPICS  # noqa: E402
from import_ai_course import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main(COURSE, TOPICS, prefix="CALC"))
