"""Employee bank account management.

Account numbers are stored in an obfuscated form (simple base64 for now;
swap with KMS-based encryption in production). API responses only show
the last 4 digits.
"""
import base64
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.bank_account import EmployeeBankAccount
from app.models.employee import Employee
from app.models.enums import RoleName
from app.models.user import User
from app.schemas.bank_account import BankAccountCreate, BankAccountOut, BankAccountUpdate

router = APIRouter(prefix="/bank-accounts", tags=["bank-accounts"])


def _encrypt(plain: str) -> str:
    """Placeholder encryption - encode to base64. Replace with real encryption."""
    return base64.b64encode(plain.encode()).decode()


def _mask(encrypted: str) -> str:
    """Show only last 4 chars of the original account number."""
    try:
        plain = base64.b64decode(encrypted.encode()).decode()
    except Exception:
        plain = encrypted
    return "XXXX" + plain[-4:] if len(plain) >= 4 else "XXXX"


def _to_out(acct: EmployeeBankAccount) -> BankAccountOut:
    return BankAccountOut(
        id=acct.id,
        employee_id=acct.employee_id,
        account_holder_name=acct.account_holder_name,
        bank_name=acct.bank_name,
        account_number_masked=_mask(acct.account_number_enc),
        ifsc_swift_code=acct.ifsc_swift_code,
        branch=acct.branch,
        is_primary=acct.is_primary,
        created_at=acct.created_at,
        updated_at=acct.updated_at,
    )


@router.get("", response_model=list[BankAccountOut])
def list_bank_accounts(
    employee_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[BankAccountOut]:
    target = employee_id or user.employee_id
    if target is None:
        return []
    # Employees can view their own; HR can view any
    if user.role.name == RoleName.employee and user.employee_id != target:
        raise HTTPException(403, "Cannot view another employee's bank accounts")
    stmt = select(EmployeeBankAccount).where(EmployeeBankAccount.employee_id == target)
    return [_to_out(a) for a in db.scalars(stmt).all()]


@router.post("", response_model=BankAccountOut, status_code=201)
def add_bank_account(
    payload: BankAccountCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(RoleName.hr_admin)),
) -> BankAccountOut:
    if db.get(Employee, payload.employee_id) is None:
        raise HTTPException(404, "Employee not found")
    acct = EmployeeBankAccount(
        employee_id=payload.employee_id,
        account_holder_name=payload.account_holder_name,
        bank_name=payload.bank_name,
        account_number_enc=_encrypt(payload.account_number),
        ifsc_swift_code=payload.ifsc_swift_code,
        branch=payload.branch,
        is_primary=payload.is_primary,
    )
    db.add(acct)
    db.commit()
    db.refresh(acct)
    return _to_out(acct)


@router.put("/{acct_id}", response_model=BankAccountOut)
def update_bank_account(
    acct_id: uuid.UUID,
    payload: BankAccountUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> BankAccountOut:
    acct = db.get(EmployeeBankAccount, acct_id)
    if acct is None:
        raise HTTPException(404, "Bank account not found")
    updates = payload.model_dump(exclude_unset=True)
    if "account_number" in updates:
        acct.account_number_enc = _encrypt(updates.pop("account_number"))
    for field, value in updates.items():
        setattr(acct, field, value)
    db.commit()
    db.refresh(acct)
    return _to_out(acct)


@router.delete("/{acct_id}", status_code=204)
def delete_bank_account(
    acct_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(RoleName.hr_admin)),
) -> None:
    acct = db.get(EmployeeBankAccount, acct_id)
    if acct is None:
        raise HTTPException(404, "Bank account not found")
    db.delete(acct)
    db.commit()
