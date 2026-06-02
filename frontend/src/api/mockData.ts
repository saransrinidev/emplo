// Placeholder data so pages render before the backend APIs are wired up.
// Replace each usage with real `api.get(...)` calls as endpoints come online.

export const profile = {
  employeeCode: "EMP-1042",
  fullName: "Alex Morgan",
  email: "alex.morgan@company.com",
  mobile: "+1 555 0142",
  dateOfBirth: "1992-04-18",
  gender: "Female",
  maritalStatus: "Single",
  dateOfJoining: "2021-09-01",
  department: "Engineering",
  designation: "Senior Software Engineer",
  manager: "Priya Nair",
  employmentStatus: "Active",
  workLocation: "Remote",
  currentAddress: "12 Maple Street, Austin, TX",
  permanentAddress: "12 Maple Street, Austin, TX",
  emergencyContact: { name: "Jordan Morgan", relationship: "Sibling", number: "+1 555 0199" },
};

export type DocStatus = "uploaded" | "verified" | "rejected";

export const documents: { id: number; name: string; type: string; status: DocStatus; uploaded: string }[] = [
  { id: 1, name: "Degree Certificate", type: "Degree", status: "verified", uploaded: "2021-09-02" },
  { id: 2, name: "12th Certificate", type: "Intermediate", status: "verified", uploaded: "2021-09-02" },
  { id: 3, name: "Transcript", type: "Transcript", status: "uploaded", uploaded: "2024-01-15" },
];

export const certifications: {
  id: number;
  name: string;
  number: string;
  issued: string;
  expiry: string | null;
  status: DocStatus;
}[] = [
  { id: 1, name: "AWS Solutions Architect", number: "AWS-2023-8841", issued: "2023-03-10", expiry: "2026-03-10", status: "verified" },
  { id: 2, name: "Azure Fundamentals", number: "AZ-900-5521", issued: "2022-06-01", expiry: "2025-06-01", status: "verified" },
  { id: 3, name: "Professional Scrum Master", number: "PSM-7723", issued: "2024-02-20", expiry: null, status: "uploaded" },
];

export const salaryHistory: {
  id: number;
  effectiveDate: string;
  previous: number;
  revised: number;
  percentage: number;
  comments: string;
}[] = [
  { id: 1, effectiveDate: "2024-04-01", previous: 110000, revised: 124000, percentage: 12.7, comments: "Annual revision" },
  { id: 2, effectiveDate: "2023-04-01", previous: 98000, revised: 110000, percentage: 12.2, comments: "Annual revision" },
  { id: 3, effectiveDate: "2021-09-01", previous: 0, revised: 98000, percentage: 0, comments: "Joining" },
];

export const reviews: {
  id: number;
  period: string;
  date: string;
  reviewer: string;
  rating: string;
  strengths: string;
  improvements: string;
}[] = [
  { id: 1, period: "FY2024", date: "2024-03-15", reviewer: "Priya Nair", rating: "4.5 / 5", strengths: "Ownership, mentoring", improvements: "Delegation" },
  { id: 2, period: "FY2023", date: "2023-03-12", reviewer: "Priya Nair", rating: "4.2 / 5", strengths: "Delivery speed", improvements: "Documentation" },
];

export const teamMembers: { id: number; name: string; designation: string; rating: string }[] = [
  { id: 1, name: "Alex Morgan", designation: "Senior Software Engineer", rating: "4.5 / 5" },
  { id: 2, name: "Sam Lee", designation: "Software Engineer", rating: "4.0 / 5" },
  { id: 3, name: "Dana Cruz", designation: "QA Engineer", rating: "3.8 / 5" },
];
