import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileWarning, ChevronRight, X, FileX } from "lucide-react";
import {
  dashboardApi,
  type MissingDocEmployee,
} from "../api/dashboard";

interface Props {
  onClose: () => void;
}

export default function MissingDocumentsModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<MissingDocEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    dashboardApi
      .missingDocuments()
      .then((res) => setEmployees(res.employees))
      .catch(() => setError("Failed to load missing documents"))
      .finally(() => setLoading(false));
  }, []);

  function goToEmployee(id: string) {
    onClose();
    navigate(`/employees/${id}?tab=documents`);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content missing-docs-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileWarning size={20} style={{ color: "hsl(var(--destructive))" }} />
            Missing Documents
          </h2>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            <X size={16} /> Close
          </button>
        </div>
        <div className="modal-body">
          {loading && (
            <p className="muted" style={{ padding: 24, textAlign: "center" }}>
              Loading...
            </p>
          )}
          {error && (
            <p style={{ padding: 24, textAlign: "center", color: "hsl(var(--destructive))" }}>
              {error}
            </p>
          )}
          {!loading && !error && employees.length === 0 && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <FileX size={40} style={{ color: "hsl(var(--success))", marginBottom: 12 }} />
              <p style={{ fontWeight: 600 }}>All documents complete</p>
              <p className="muted">Every employee has submitted their required documents.</p>
            </div>
          )}
          {!loading && !error && employees.length > 0 && (
            <>
              <p className="muted" style={{ marginBottom: 12 }}>
                {employees.length} employee{employees.length > 1 ? "s" : ""} missing one or
                more required documents. Click a row to review.
              </p>
              <div className="missing-docs-list">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    className="missing-docs-row"
                    onClick={() => goToEmployee(emp.id)}
                  >
                    <div className="missing-docs-row-main">
                      <div className="missing-docs-row-name">
                        {emp.full_name}
                        {emp.employee_code && (
                          <span className="missing-docs-code">{emp.employee_code}</span>
                        )}
                      </div>
                      <div className="missing-docs-row-meta">
                        {[emp.designation, emp.department].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="missing-docs-tags">
                        {emp.missing_documents.map((doc) => (
                          <span key={doc} className="missing-docs-tag">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={18} className="missing-docs-row-chevron" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
