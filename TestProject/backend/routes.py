from fastapi import HTTPException, Depends, APIRouter
from typing import List
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from ai import generate_quiz
from auth import create_access_token, get_current_user

try:
    from backend.database import get_db
    from backend.models import User
    from backend.schemas import UserCreate, UserLogin, UserResponse
except ImportError:
    from database import get_db
    from models import User
    from schemas import UserCreate, UserLogin, UserResponse


router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], truncate_error=False)


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/users", response_model=List[UserResponse])
async def read_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
async def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    if len(user.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password must be 72 characters or less")

    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(user.password)
    new_user = User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login")
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not pwd_context.verify(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/read/generate_quiz")
def generate_quiz_endpoint(topic: str, num_questions: int = 5):
    try:
        quiz = generate_quiz(topic, num_questions)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



