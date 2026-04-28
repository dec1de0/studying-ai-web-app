from groq import Groq
import os
import json
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv('GROQ_API_KEY'))

#helper funcs

def chunk_text(text: str, max_chars: int = 10000) -> str:
    if len(text) <= max_chars:
        return text
    half = max_chars // 2
    return text[:half] + "\n...\n" + text[-half:]


def parse_json(raw: str) -> dict:
    raw = raw.strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])

#ai funcs

def generate_lecture_notes(text: str) -> dict:
    content = chunk_text(text)
    prompt = f"""
    Generate structured lecture notes based on the following content.
    Return ONLY valid JSON, no extra text, no markdown:
    {{
        "sections": [
            {{
                "title": "Section Title",
                "content": "Detailed content of the section."
            }}
        ]
    }}

    Content:
    {content}
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return parse_json(response.choices[0].message.content)


def generate_quiz(text: str, num_questions: int = 5):
    content = chunk_text(text)
    prompt = f"""
    Generate a quiz with {num_questions} multiple choice questions based on the following content.
    Return ONLY valid JSON, no extra text, no markdown:
    {{
        "questions": [
            {{
                "question": "Question text?",
                "options": ["A", "B", "C", "D"],
                "correct_answer": "A"
            }}
        ]
    }}

    Content:
    {content}
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return parse_json(response.choices[0].message.content)


def generate_flashcards(text: str, num_flashcards: int = 5):
    content = chunk_text(text)
    prompt = f"""
    Generate {num_flashcards} flashcards based on the following content.
    Return ONLY valid JSON, no extra text, no markdown:
    {{
        "flashcards": [
            {{
                "question": "Question text?",
                "answer": "Answer text."
            }}
        ]
    }}

    Content:
    {content}
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return parse_json(response.choices[0].message.content)