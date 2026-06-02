from pydantic import BaseModel, EmailStr

from app.models.enums import RoleName


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: RoleName = RoleName.employee


class CurrentUser(BaseModel):
    id: str
    email: EmailStr
    role: RoleName
