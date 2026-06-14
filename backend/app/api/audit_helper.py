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
    before_data: dict | None = None,
    after_data: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Write an audit log entry. Call this after any significant action.

    Parameters:
        changes: legacy field for quick diff summaries
        before_data: full snapshot of the entity before the change
        after_data: full snapshot of the entity after the change
    """
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=changes,
        before_data=before_data,
        after_data=after_data,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    # Don't commit here — let the caller's transaction handle it.
