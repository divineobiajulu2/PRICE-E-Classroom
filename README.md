# PRICE E-Classroom

A university-style e-classroom platform with three roles — **Admin**, **Instructor**, and **Student** — built for a set/stream-based academic structure (e.g. cohorts and departments).

## How it works

- **Admins** create courses, scope each one to a set (e.g. "Set 5") and a stream (e.g. "ICT", or `general` for all streams), and assign one or more instructors to teach it.
- **Instructors** see only the courses they've been assigned to. Within a course, they post materials (notes/videos) and create assignments (file/text submission or interactive quizzes) — all scoped to that specific course.
- **Students** automatically see any course matching their own set and stream — there's no manual enrollment. Inside a course, they see the list of assigned instructors, and can view each instructor's materials/assignments and submit work.

Course visibility to students is computed eligibility (set + stream match), not an enrollment/approval flow. Instructor assignment is many-to-many — one instructor can teach multiple courses, one course can have multiple instructors.

## Tech stack

- **Backend:** Django + Django REST Framework, JWT auth (`rest_framework_simplejwt`), SQLite for local development / PostgreSQL in production
- **Frontend:** React + TypeScript, Vite, Tailwind CSS, React Router (`HashRouter`)

## Project structure

```
├── frontend/           # React + Vite frontend
└── work/backend/       # Django backend (project folder: assessment/, main app: core/)
```

## Running locally

### Backend

```bash
cd work/backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend runs at `http://localhost:8000` by default; API base is `http://localhost:8000/api`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` with:
```
VITE_API_URL=http://localhost:8000
```

Frontend runs at `http://localhost:3000` by default.

## Environment variables (backend, production)

| Variable | Purpose |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `False` in production |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hostnames |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `DATABASE_URL` | PostgreSQL connection string (falls back to SQLite if unset) |

## Roles at a glance

| Role | Can do |
|---|---|
| Admin | Create/edit/delete courses, assign instructors, manage users, approve pending registrations |
| Instructor | View assigned courses, post materials, create assignments, grade submissions, delete their own materials/assignments |
| Student | View eligible courses (auto-matched by set/stream), view instructor content, submit assignments, view grades |
