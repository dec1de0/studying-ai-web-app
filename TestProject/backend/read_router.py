from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from file_reader import read_file
from ai import generate_quiz, generate_lecture_notes, generate_flashcards
from auth import get_current_user
from models import User

router = APIRouter(prefix="/read")

user_texts: dict[int, str] = {}

@router.post("")
async def read(
        file: UploadFile = File(...),
        current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith((".txt", ".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only txt, pdf, docx supported")
    content = await file.read()
    text = read_file(content, file.filename)
    user_texts[current_user.id] = text
    return {"message": "File read successfully", "chars": len(text)}

@router.post("/generate_quiz")
def quiz(current_user: User = Depends(get_current_user)):
    text = user_texts.get(current_user.id)
    if not text:
        raise HTTPException(status_code=400, detail="Upload a file first via /read")
    return generate_quiz(text)  # передаём текст файла, не topic

@router.post("/lecture_notes")
def lecture_notes(current_user: User = Depends(get_current_user)):
    text = user_texts.get(current_user.id)
    if not text:
        raise HTTPException(status_code=400, detail="Upload a file first via /read")
    return generate_lecture_notes(text)

@router.post("/flashcards")
def flashcards(current_user: User = Depends(get_current_user)):
    text = user_texts.get(current_user.id)
    if not text:
        raise HTTPException(status_code=400, detail="Upload a file first via /read")
    return generate_flashcards(text)