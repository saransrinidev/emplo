import type { DocStatus } from "../api/mockData";

const LABELS: Record<DocStatus, string> = {
  uploaded: "Uploaded",
  verified: "Verified",
  rejected: "Rejected",
};

export default function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className={status === "verified" ? "badge badge-solid" : "badge"}>
      {LABELS[status]}
    </span>
  );
}
