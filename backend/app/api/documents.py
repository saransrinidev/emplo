import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.api.helpers import require_view_employee
from app.db.session import get_db
from app.models.document import Document
from app.models.enums import RoleName, VerificationStatus
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentOut, VerifyRequest

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentOut])
def list_documents(
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Document]:
    target = employee_id or user.employee_id
    if target is None:
        return []
    require_view_employee(db, user, target)
    stmt = select(Document).where(Document.employee_id == target)
    return list(db.scalars(stmt).all())


@router.post("", response_model=DocumentOut, status_code=201)
def upload_document(
    payload: DocumentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Document:
    target_employee_id = payload.employee_id or user.employee_id
    if target_employee_id is None:
        raise HTTPException(status_code=400, detail="No employee record linked to this account")
    if user.role.name == RoleName.employee and user.employee_id != target_employee_id:
        raise HTTPException(status_code=403, detail="Cannot upload for another employee")

    data = payload.model_dump(exclude={"employee_id"})

    # If a document of the same type already exists for this employee, replace it
    existing = db.scalar(
        select(Document).where(
            Document.employee_id == target_employee_id,
            Document.document_type == data.get("document_type"),
        )
    )

    if existing and data.get("document_type") != "other":
        # Update the existing document (re-upload)
        existing.document_name = data.get("document_name") or existing.document_name
        existing.file_url = data["file_url"]
        existing.status = VerificationStatus.uploaded  # Reset to pending
        existing.verified_by = None
        existing.verified_at = None
        doc = existing
        db.flush()

        from app.api.audit_helper import log_action
        log_action(db, actor_id=user.id, action="reupload", entity_type="document",
                   entity_id=str(doc.id), changes={"document_name": doc.document_name, "document_type": doc.document_type})
    else:
        # Create new document
        doc = Document(employee_id=target_employee_id, **data)
        db.add(doc)
        db.flush()

        from app.api.audit_helper import log_action
        log_action(db, actor_id=user.id, action="upload", entity_type="document",
                   entity_id=str(doc.id), changes={"document_name": doc.document_name, "document_type": doc.document_type})

    db.commit()
    db.refresh(doc)

    # Notify HR and manager when employee/manager uploads a document
    if user.role.name != RoleName.hr_admin:
        from app.api.notify import notify_hr_and_manager
        from app.models.employee import Employee
        emp = db.get(Employee, target_employee_id)
        emp_name = emp.full_name if emp else "An employee"
        notify_hr_and_manager(
            db, user,
            title="Document Uploaded",
            message=f"{emp_name} uploaded a document: {doc.document_name or doc.document_type} [employee:{target_employee_id}]",
        )
        db.commit()

    return doc


@router.put("/{doc_id}/verify", response_model=DocumentOut)
def verify_document(
    doc_id: uuid.UUID,
    payload: VerifyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> Document:
    doc = db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    doc.status = payload.status
    doc.verified_by = user.id
    doc.verified_at = datetime.now(timezone.utc)

    from app.api.audit_helper import log_action
    log_action(db, actor_id=user.id, action=f"verify_{payload.status.value}", entity_type="document",
               entity_id=str(doc.id), changes={"status": payload.status.value})

    db.commit()
    db.refresh(doc)
    return doc
