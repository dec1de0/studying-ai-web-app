import fitz
from docx import Document

def read_file(file_bytes: bytes, filename: str) -> str:
    ext = filename.split(".")[-1].lower()

    if ext == "txt":
        return file_bytes.decode("utf-8")

    elif ext == "pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)

    elif ext == "docx":
        import io
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    else:
        raise ValueError(f"Unsupported file type: {ext}")
