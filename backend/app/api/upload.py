"""File upload endpoint — stores file as base64 data URL in the database."""
import base64

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["upload"])

# Max file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
) -> dict:
    """Upload a file and return it as a base64 data URL.

    The data URL can be stored directly in the database and rendered
    in an <img> tag or opened in a new tab without any external storage.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")

    # Determine MIME type
    content_type = file.content_type or "application/octet-stream"

    # Convert to base64 data URL
    b64 = base64.b64encode(content).decode("utf-8")
    data_url = f"data:{content_type};base64,{b64}"

    return {"url": data_url, "filename": file.filename}
