from pydantic import BaseModel
from pydantic import EmailStr



class UserBase(BaseModel):
    email: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int

    class Config:
        from_attribute = True
