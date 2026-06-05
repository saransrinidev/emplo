"""Helper to write audit log entries from any endpoint."""
import uuid

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    *,
    actor_id: uuid.UUID | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    changes: dict | None = None,
) -> None:
    """Write an audit log entry. Call this after any significant action."""
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=changes,
    )
    db.add(entry)
    # Don't commit here — let the caller's transaction handle it.
