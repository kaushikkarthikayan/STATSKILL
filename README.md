# StatSkill AI

Student skill assessment, MCQ practice, progress reports and course training.

## Project layout

```
StatSkillAI/
  README.md
  backend/              FastAPI + Peewee API (built)
    app/
      api/routes/       one file per feature (auth, profile, courses, questions, assessments, ...)
      core/             settings (config.py) and security (passwords, tokens)
      db/               database connection and all models
      services/         question selection, scoring, progress, recommendations, uploads
      schemas.py        request and response validation
      main.py           application entry point
    scripts/            create_admin.py, import_sample_course.py
    data/               sample_questions.json; the SQLite database is created here on first run
    tests/              automated tests
    requirements.txt
    .env.example        copy to .env and fill in
  frontend/             React + Vite website (built from the attached template)
```

## Quick start (Windows)

1. Double-click `Create-Admin.bat` once and enter your name, email and a password. This is your administrator account.
2. Double-click `Start-StatSkillAI.bat`. It opens the API and the website in two windows and then opens http://127.0.0.1:5173.
3. Close the two windows to stop.

Students sign up themselves on the website. The sample Statistics course (20 starter questions, marked as samples) is already loaded. Replace those questions with your own under Manage content.

## Backend setup (Windows PowerShell)

Requires Python 3.12. Run these from the `backend` folder.

```bash
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create your settings file:

```bash
copy .env.example .env
```

Open `.env` and set `SECRET_KEY`. To generate a key:

```bash
.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
```

Create the first administrator (the password is typed hidden):

```bash
.venv\Scripts\python.exe scripts\create_admin.py
```

Load the sample Statistics course (20 starter questions, marked as sample content):

```bash
.venv\Scripts\python.exe scripts\import_sample_course.py
```

Start the API:

```bash
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Then open http://127.0.0.1:8000/docs for the interactive API documentation.

Run the automated tests:

```bash
.venv\Scripts\python.exe -m pytest
```

## Database

- **SQLite (default):** `DB_ENGINE=sqlite`. The database is the file `backend/data/statskill.db`. Nothing needs installing.
- **PostgreSQL (optional):** install PostgreSQL, create a database called `statskill_db`, then set `DB_ENGINE=postgres` and the `DATABASE_*` values in `.env`. Tables are created automatically when the API starts.

## Settings (`backend/.env`)

| Setting | Purpose |
|---|---|
| `DB_ENGINE`, `SQLITE_PATH`, `DATABASE_*` | Database choice and connection |
| `SECRET_KEY` | Signs login tokens. Keep it private. |
| `ACCESS_TOKEN_EXPIRE_MINUTES`, `REMEMBER_ME_DAYS` | Session lengths |
| `RESET_TOKEN_MINUTES`, `PRINT_RESET_LINKS` | Password reset links (printed in the terminal until email is set up) |
| `FRONTEND_URL`, `CORS_ORIGINS` | Where the website runs |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Study-file storage and size limit (PDF and DOCX only) |

## API areas (all under `/api`)

| Area | What it does |
|---|---|
| `/auth` | Register, login (with remember me), logout, current user, change and reset password |
| `/profile` | Student details, the course being prepared for, interests |
| `/courses`, `/courses/{id}/topics`, `/topics/{id}` | Course catalogue |
| `/questions` | MCQ bank: add, edit, remove, import (questions have unique codes) |
| `/assessments` | Start an assessment, practice or revision set; answer; submit; history |
| `/progress/report`, `/dashboard`, `/recommendations` | Results, weak areas, missing skills, recommendations |
| `/resources` | Upload PDF/DOCX, add links and notes, download, mark completion |
| `/training/topics/{id}` | Everything the all-in-one topic page needs |
| `/books` | Book links, save and unsave |
| `/health` | Quick check that the API is running |

## Roles

- **student:** takes tests and practice sets, reads published material and books, saves books.
- **content_creator:** manages courses, questions, material and books.
- **admin:** everything, including deleting courses and topics.

## Security notes

- `.env` holds the secret key and any database password. Never share it or commit it.
- Passwords are hashed with bcrypt. Logout and password change end every session.
- Uploads are checked by type, size and file content. Files are stored under random names.
- Questions a student has already answered are deactivated, not deleted, so past results stay accurate.

## Website setup (Node.js 20 or newer)

Run these from the `frontend` folder, in a second terminal while the API is running.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. If the API runs somewhere other than http://127.0.0.1:8000, copy `.env.example` to `.env` and set `VITE_API_URL`.

Signing up creates a student. Run `scripts\create_admin.py` once to create the first administrator, then promote other people to content creator under Manage content > Users.

Pages: welcome, log in and sign up, dashboard, profile, assessment (test runner and results), progress report, course training (course page and the all-in-one topic page), about and creators, and Manage content for creators and administrators.

## Windows note: Smart App Control

On some Windows 11 laptops, Smart App Control blocks the compiled parts of Python packages (such as `pydantic_core`) and possibly of the website's build tool. If you see "An Application Control policy has blocked this file", run the backend and website inside WSL2 (Ubuntu), or turn Smart App Control off in Windows Security. Turning it off generally cannot be undone without reinstalling Windows.

## Status

- Backend: 34 automated tests, all passing.
- Website: builds cleanly and was checked in a browser: sign up, log in and out, password reset, profile, assessment and results, progress report, course training and the topic page, about and creators, content management, users, and the phone layout.
- Not checked in a browser: uploading a PDF or DOCX through the Manage content form. The backend upload checks (type, size, file content) are covered by automated tests.


## New in the redesign

- **Cartoon / graffiti design**: stickman coach, 13 pick-able avatars, doodles, draggable footer stickers, a sketch cursor (mouse only; normal cursor on touch, reduced motion and when switched off in the menu), scroll and page-transition animations, and a paper "PULL ME" menu.
- **Dashboard**: progress, accuracy, streak, continue-where-you-stopped, up next, course cards, charts, activity, recommended topics and badges. Everything comes from stored answers.
- **Profile builder**: six saved steps (character, details, course, interests, learning style, theme). The theme recolours the whole site.
- **Course Training levels**: each topic is a level (not started / in progress / completed) with its own illustration, plan selection and per-topic mastery.
- **Assessment setup**: pick course, test type, one or more topics, difficulty and number of questions.
- **Progress report**: animated donut, line chart, completed and pending topics, milestones and badges.
- **About, "Pick Your Player"**: 10 team members in order (1 Kaushik Karthikayan, 2 Jhon Fanny, 3 Anna, 4 Jonas "Jons", 5 Ashwin, 6 Neha, 7 Karthikayan, 8 Princy, 9 Cris, 10 Jude). Descriptions are placeholders; administrators can edit every field.
- **Study buddy**: a small rule-based helper that answers from the student's own results. It is not a language model.

### Backend additions

`/api/learning/*` (overview, topics, selection), `/api/profile/options`, `/api/assistant/*`, new profile and creator fields, a per-student topic selection table, and a start-up step that adds the new columns to an older database. Run the tests with `python -m pytest tests` in `backend`.

## Deploying

Backend: set `SECRET_KEY` (32+ characters), `DB_ENGINE=postgres` with the `DATABASE_*` values, `FRONTEND_URL` and `CORS_ORIGINS`; start with `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Frontend: build with `VITE_API_URL=https://your-api/api`, and rewrite all paths to `index.html`.

### AI course

Run `python scripts/import_ai_course.py` in `backend` to add *Artificial Intelligence Foundations*: 6 topics (What Is AI, Machine Learning Basics, Neural Networks and Deep Learning, Language Models and NLP, Computer Vision, Responsible AI and Ethics), a study note and key points for each, and 30 sample MCQs. Review the sample questions before real use. Safe to run twice.

### More courses, My notes and the ghost and hanging figure

- `python scripts/import_ai_course.py` now loads 13 AI topics; `python scripts/import_calculus_course.py` adds Engineering Mathematics: Calculus (8 topics, notes, 40 sample MCQs). Notes are original text, not copied from any textbook. Review the sample questions before real use.
- **My notes** (`/notes`): students upload PDF or DOCX notes, or paste text. Notes are private to the student and also appear in a topic's *My notes* tab.
- **Study buddy**: level, XP, streak, plan and next-step buttons, from the student's own results (fixed rules, not an AI model).
- **Characters**: a ghost (the study buddy, who says Hii when touched, plans your work and points out your mistakes) and a stick figure who hangs from the PULL ME cord, sometimes slips, and is caught by the ghost. Both are switched off by *Reduce motion*.

### One-click deploy (Render + Vercel)

1. **Render**: New > Blueprint > pick this repo. `render.yaml` creates the free database and the API, generates `SECRET_KEY`, and `scripts/bootstrap.py` creates the tables and loads the three courses on every start (no shell needed). Fill in `ADMIN_EMAIL` and `ADMIN_PASSWORD` to create your administrator.
2. **Vercel**: import the repo, Root Directory `frontend`, environment variable `VITE_API_URL=https://<your-render-address>/api`.
3. Back in Render set `FRONTEND_URL` and `CORS_ORIGINS` to the Vercel address (no trailing slash), then redeploy.
