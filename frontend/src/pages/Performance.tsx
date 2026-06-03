import { useEffect, useState, type FormEvent } from "react";
import { Star, User as UserIcon } from "lucide-react";
import { employeesApi, type Employee } from "../api/employees";
import { performanceApi } from "../api/features";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

export default function Performance() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  return (
    <div>
      <PageHeader
        title="Performance Reviews"
        subtitle={isManager ? "Your reviews and team performance." : "Your review history and ratings."}
      />
      <MyPerformance />
      {isManager && <TeamPerformance />}
    </div>
  );
}

// ------- My Performance (all roles) -------

function MyPerformance() {
  const { data, loading, error } = useApi(() => performanceApi.list());
  const reviews = data ?? [];

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ marginBottom: 16, fontSize: 16 }}>My Reviews</h2>
      <AsyncState loading={loading} error={error}>
        {reviews.length === 0 ? (
          <p className="muted">No performance reviews yet.</p>
        ) : (
          <div className="stack">
            {reviews.map((review) => (
              <div key={review.id} className="card">
                <div className="row" style={{ marginBottom: 12 }}>
                  <h2>{review.review_period ?? "Review"}</h2>
                  {review.rating && (
                    <span className="badge badge-solid">{review.rating} / 5</span>
                  )}
                </div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="detail-label">Review Date</div>
                    <div className="detail-value">{review.review_date ?? "—"}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Reviewer</div>
                    <div className="detail-value">{review.reviewer_name ?? "—"}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Strengths</div>
                    <div className="detail-value">{review.strengths ?? "—"}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Areas for Improvement</div>
                    <div className="detail-value">{review.areas_for_improvement ?? "—"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AsyncState>
    </div>
  );
}

// ------- Team Performance (manager only) -------

function TeamPerformance() {
  const [team, setTeam] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<Employee | null>(null);

  useEffect(() => {
    employeesApi
      .list()
      .then(setTeam)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ marginBottom: 16, fontSize: 16 }}>Team Members</h2>
      {loading && <p className="muted">Loading team...</p>}

      {!loading && team.length === 0 && (
        <p className="muted">No direct reports assigned to you.</p>
      )}

      {!loading && team.length > 0 && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {team.map((emp) => (
            <div
              key={emp.id}
              className="card"
              style={{ cursor: "pointer", padding: 16 }}
              onClick={() => setReviewTarget(emp)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--primary-light)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <UserIcon size={20} style={{ color: "var(--primary-color)" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--text)", fontSize: 14 }}>
                    {emp.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {emp.employee_code} · {emp.designation ?? "Employee"}
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <Star size={16} style={{ color: "var(--primary-color)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Review Modal */}
      {reviewTarget && (
        <AddTeamReviewModal
          employee={reviewTarget}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </div>
  );
}

// ------- Add Team Review Modal -------

function AddTeamReviewModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const [reviewPeriod, setReviewPeriod] = useState("");
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewPeriod) {
      setError("Review period is required (e.g. Q1 2024, FY2024).");
      return;
    }
    if (!rating) {
      setError("Rating is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await performanceApi.add({
        employee_id: employee.id,
        review_period: reviewPeriod,
        review_date: reviewDate || undefined,
        rating: rating,
        strengths: strengths || undefined,
        areas_for_improvement: improvements || undefined,
        comments: comments || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Review: {employee.full_name}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {success ? (
            <>
              <div style={{ padding: 16, background: "var(--primary-light)", borderRadius: "var(--radius)", marginBottom: 16, textAlign: "center" }}>
                <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 500 }}>
                  ✓ Performance review submitted!
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4 }}>
                  {employee.full_name} will be notified about this review.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-sm" onClick={onClose}>Done</button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                Submit a performance review for <strong style={{ color: "var(--text)" }}>{employee.full_name}</strong> ({employee.employee_code}).
              </p>
              <div className="form-grid">
                <div className="field">
                  <label>Review Period *</label>
                  <input
                    className="input"
                    value={reviewPeriod}
                    onChange={(e) => setReviewPeriod(e.target.value)}
                    placeholder="e.g. Q2 2024, FY2024"
                  />
                </div>
                <div className="field">
                  <label>Review Date</label>
                  <input
                    className="input"
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Rating (1-5) *</label>
                  <select className="input" value={rating} onChange={(e) => setRating(e.target.value)}>
                    <option value="">Select rating</option>
                    <option value="1">1 - Needs Improvement</option>
                    <option value="2">2 - Below Expectations</option>
                    <option value="3">3 - Meets Expectations</option>
                    <option value="4">4 - Exceeds Expectations</option>
                    <option value="5">5 - Outstanding</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Strengths</label>
                <textarea
                  className="input"
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="What did they do well?"
                  style={{ resize: "vertical" }}
                />
              </div>
              <div className="field">
                <label>Areas for Improvement</label>
                <textarea
                  className="input"
                  rows={2}
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="What can they improve?"
                  style={{ resize: "vertical" }}
                />
              </div>
              <div className="field">
                <label>Comments</label>
                <textarea
                  className="input"
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Any additional notes..."
                  style={{ resize: "vertical" }}
                />
              </div>
              {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-sm" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
