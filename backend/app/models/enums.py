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


class NotificationType(str, enum.Enum):
    certification_expiry = "certification_expiry"
    missing_documents = "missing_documents"
    permission_granted = "permission_granted"
    permission_expiring = "permission_expiring"
    salary_revision_completed = "salary_revision_completed"
    performance_review_published = "performance_review_published"
