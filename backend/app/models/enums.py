import enum


class RoleName(str, enum.Enum):
    employee = "employee"
    manager = "manager"
    hr_admin = "hr_admin"


class AddressType(str, enum.Enum):
    current = "current"
    permanent = "permanent"


class DocumentType(str, enum.Enum):
    school = "school"
    intermediate = "intermediate"
    degree = "degree"
    transcript = "transcript"
    other = "other"


class VerificationStatus(str, enum.Enum):
    uploaded = "uploaded"
    verified = "verified"
    rejected = "rejected"


class CertificationCategory(str, enum.Enum):
    microsoft = "microsoft"
    aws = "aws"
    azure = "azure"
    scrum = "scrum"
    power_bi = "power_bi"
    other = "other"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class EditableSection(str, enum.Enum):
    address = "address"
    phone = "phone"
    certifications = "certifications"


class LeaveType(str, enum.Enum):
    casual = "casual"
    sick = "sick"
    earned = "earned"
    maternity = "maternity"
    paternity = "paternity"
    unpaid = "unpaid"


class LeaveStatus(str, enum.Enum):
    pending = "pending"             # just submitted by employee
    forwarded_to_hr = "forwarded_to_hr"  # manager approved, sent to HR
    approved = "approved"           # HR approved
    rejected = "rejected"           # rejected at any stage
