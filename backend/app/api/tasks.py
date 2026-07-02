"""Task management API.

- Managers create tasks and assign to their direct reports
- HR can create tasks for anyone
- Employees view their tasks, update status, and close with a statement
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CreateTask(BaseModel):
    title: str
    description: str | None = None
    assigned_to: uuid.UUID
    due_date: str | None = None  # YYYY-MM-DD
    priority: TaskPriority = TaskPriority.medium


class CompleteTask(BaseModel):
    completion_note: str


class UpdateTaskStatus(BaseModel):
    status: TaskStatus


class TaskOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None = None
    assigned_by: uuid.UUID
    assigned_by_name: str | None = None
    assigned_to: uuid.UUID
    assigned_to_name: str | None = None
    due_date: str | None = None
    priority: TaskPriority
    status: TaskStatus
    completion_note: str | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_out(task: Task, db: Session) -> TaskOut:
    by_emp = db.get(Employee, task.assigned_by)
    to_emp = db.get(Employee, task.assigned_to)
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        assigned_by=task.assigned_by,
        assigned_by_name=by_emp.full_name if by_emp else None,
        assigned_to=task.assigned_to,
        assigned_to_name=to_emp.full_name if to_emp else None,
        due_date=str(task.due_date) if task.due_date else None,
        priority=task.priority,
        status=task.status,
        completion_note=task.completion_note,
        completed_at=task.completed_at,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


# ─── Manager/HR: Create task ──────────────────────────────────────────────────

@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    payload: CreateTask,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.manager, RoleName.hr_admin)),
) -> TaskOut:
    if not user.employee_id:
        raise HTTPException(400, "No employee record linked")
    if not payload.title.strip():
        raise HTTPException(400, "Title is required")

    # Verify assigned_to exists
    target = db.get(Employee, payload.assigned_to)
    if not target:
        raise HTTPException(404, "Target employee not found")

    # Managers can only assign to their direct reports
    if user.role.name == RoleName.manager:
        if target.manager_id != user.employee_id:
            raise HTTPException(403, "You can only assign tasks to your direct reports")

    from datetime import date
    due = None
    if payload.due_date:
        try:
            due = date.fromisoformat(payload.due_date)
        except ValueError:
            raise HTTPException(400, "Invalid due_date format (use YYYY-MM-DD)")

    task = Task(
        title=payload.title.strip(),
        description=payload.description,
        assigned_by=user.employee_id,
        assigned_to=payload.assigned_to,
        due_date=due,
        priority=payload.priority,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Notify the employee
    emp_user = db.scalar(select(User).where(User.employee_id == payload.assigned_to))
    if emp_user:
        from app.api.notifications import Notification
        assigner = db.get(Employee, user.employee_id)
        db.add(Notification(
            user_id=emp_user.id,
            title="New Task Assigned",
            message=f"{assigner.full_name if assigner else 'Manager'} assigned you: {task.title}" + (f" (Due: {due})" if due else ""),
        ))
        db.commit()

    return _to_out(task, db)


# ─── Employee: View my tasks ──────────────────────────────────────────────────

@router.get("/my", response_model=list[TaskOut])
def my_tasks(
    status: TaskStatus | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[TaskOut]:
    """Employee views tasks assigned to them."""
    if not user.employee_id:
        return []
    stmt = select(Task).where(Task.assigned_to == user.employee_id).order_by(Task.created_at.desc())
    if status:
        stmt = stmt.where(Task.status == status)
    return [_to_out(t, db) for t in db.scalars(stmt).all()]


# ─── Manager: View tasks assigned by me ───────────────────────────────────────

@router.get("/assigned", response_model=list[TaskOut])
def assigned_tasks(
    status: TaskStatus | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.manager, RoleName.hr_admin)),
) -> list[TaskOut]:
    """Manager/HR views tasks they've assigned."""
    if not user.employee_id:
        return []
    stmt = select(Task).where(Task.assigned_by == user.employee_id).order_by(Task.created_at.desc())
    if status:
        stmt = stmt.where(Task.status == status)
    return [_to_out(t, db) for t in db.scalars(stmt).all()]


# ─── Employee: Complete a task ─────────────────────────────────────────────────

@router.put("/{task_id}/complete", response_model=TaskOut)
def complete_task(
    task_id: uuid.UUID,
    payload: CompleteTask,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> TaskOut:
    """Employee marks a task as completed with a closing statement."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.assigned_to != user.employee_id:
        raise HTTPException(403, "This task is not assigned to you")
    if task.status in (TaskStatus.completed, TaskStatus.closed):
        raise HTTPException(400, "Task is already completed/closed")

    task.status = TaskStatus.completed
    task.completion_note = payload.completion_note
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    # Notify the manager
    mgr_user = db.scalar(select(User).where(User.employee_id == task.assigned_by))
    if mgr_user:
        from app.api.notifications import Notification
        emp = db.get(Employee, user.employee_id)
        db.add(Notification(
            user_id=mgr_user.id,
            title="Task Completed",
            message=f"{emp.full_name if emp else 'Employee'} completed: {task.title}",
        ))
        db.commit()

    return _to_out(task, db)


# ─── Manager: Close/reopen a task ─────────────────────────────────────────────

@router.put("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: uuid.UUID,
    payload: UpdateTaskStatus,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.manager, RoleName.hr_admin)),
) -> TaskOut:
    """Manager can close, reopen, or update task status."""
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.assigned_by != user.employee_id and user.role.name != RoleName.hr_admin:
        raise HTTPException(403, "You didn't assign this task")

    task.status = payload.status
    if payload.status == TaskStatus.closed and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return _to_out(task, db)
