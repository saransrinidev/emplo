import type { VerificationStatus } from "../api/types";

const LABELS: Record<VerificationStatus, string> = {
  uploaded: "Uploaded",
  verified: "Verified",
  rejected: "Rejected",
};

export default function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={status === "verified" ? "badge badge-solid" : "badge"}>
      {LABELS[status]}
    </span>
  );
}
