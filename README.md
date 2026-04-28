# 📚 Study with AI
 
An AI-powered studying assistant. Upload your lecture notes, get quizzes, flashcards, and structured summaries — instantly.
 
> Built by **me - Yerzat** purely for fun and learning. Started as a FastAPI experiment, ended up as something actually useful. Special thanks to Claude and to my late-night study habit
 
---




<img width="1680" height="1050" alt="Снимок экрана 2026-04-29 в 00 55 58" src="https://github.com/user-attachments/assets/3eb6187c-39ae-4418-9716-e6cb9b713a06" />


------------


<img width="1680" height="1050" alt="Снимок экрана 2026-04-29 в 00 56 23" src="https://github.com/user-attachments/assets/499cefca-6909-4421-816a-3aa840759288" />


-----


 
## What it does
 
- Upload a file (PDF, DOCX, or TXT) and let AI do the work
- **Generate a quiz** — multiple choice questions based on your material
- **Generate flashcards** — key terms and definitions to memorize
- **Generate lecture notes** — structured summary of the content
- **JWT authentication** — register, login, and access your content securely
---
 
## Project structure
 
```
StudyPro/
├── backend/
│   ├── main.py          # FastAPI app, CORS, routing
│   ├── routes.py        # Auth endpoints (register, login, /me)
│   ├── read_router.py   # /read endpoints (upload, quiz, flashcards, notes)
│   ├── ai.py            # Groq API integration
│   ├── auth.py          # JWT token logic
│   ├── models.py        # SQLAlchemy models
│   ├── schemas.py       # Pydantic schemas
│   ├── database.py      # DB connection and session
│   └── file_reader.py   # PDF, DOCX, TXT parsing
├── frontend/
│   ├── index.html       # Register page
│   ├── login.html       # Login page
│   ├── study.html       # Main study page
│   ├── success.html     # Success page
│   ├── app.js           # Frontend logic
│   └── styles.css       # Styling
└── .env                 # API keys (not committed)
```
 
---
 
## Tech stack
 
**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — REST API
- [SQLAlchemy](https://www.sqlalchemy.org/) — ORM + SQLite
- [Pydantic v2](https://docs.pydantic.dev/) — data validation
- [passlib + bcrypt](https://passlib.readthedocs.io/) — password hashing
- [python-jose](https://python-jose.readthedocs.io/) — JWT tokens
- [Groq](https://groq.com/) — AI via LLaMA 3.3 70B
- [PyMuPDF](https://pymupdf.readthedocs.io/) — PDF parsing
- [python-docx](https://python-docx.readthedocs.io/) — DOCX parsing
**Frontend**
- Vanilla HTML + CSS + JS
---
 
## Getting started
 
**1. Clone the repo**
```bash
git clone https://github.com/yourusername/studypro.git
cd studypro
```
 
**2. Install dependencies**
```bash
pip install fastapi uvicorn sqlalchemy passlib python-jose python-dotenv groq pymupdf python-docx bcrypt==3.2.2 python-multipart "pydantic[email]"
```
 
**3. Add your keys to `.env`**
```
GROQ_API_KEY=your_groq_key_here
SECRET_KEY=your_secret_key_here
```
 
Generate a secret key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```
 
Get a free Groq key at [console.groq.com](https://console.groq.com)
 
**4. Run the server**
```bash
cd backend
uvicorn main:app --reload
```
 
Open `http://127.0.0.1:8000/docs` for the interactive API docs.
 
---
 
## API endpoints
 
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/register` | — | Create account |
| POST | `/login` | — | Get JWT token |
| GET | `/me` | ✓ | Current user info |
| POST | `/read` | ✓ | Upload file |
| POST | `/read/generate_quiz` | ✓ | Generate quiz from uploaded file |
| POST | `/read/flashcards` | ✓ | Generate flashcards |
| POST | `/read/lecture_notes` | ✓ | Generate lecture notes |
 
 
