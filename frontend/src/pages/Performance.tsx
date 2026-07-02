import { useEffect, useState } from "react";
import { Star, User as UserIcon, Eye } from "lucide-react";
import { employeesApi, type Employee } from "../api/employees";
import { performanceApi } from "../api/performance";
import type { PerformanceReview } from "../api/performance";
import { useAuth } from "../context/AuthContext";
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
  const { data, loading, error } = useApi(() => performanceApi.list(), [], "performance:my");
  const reviews = data ?? [];

  return (
    <div style={{ marginBottom: 32 }}>
      {reviews.length > 0 && <h2 style={{ marginBottom: 16, fontSize: 16 }}>My Reviews</h2>}
      <AsyncState loading={loading} error={error}>
        {reviews.length === 0 ? (
          <p className="muted">No performance reviews yet.</p>
        ) : (
          <div className="stack">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </AsyncState>
    </div>
  );
}

// ------- Review Card -------

function ReviewCard({ review }: { review: PerformanceReview }) {
  return (
    <div className="card">
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
  );
}

// ------- Team Performance (manager only — view only) -------

function TeamPerformance() {
  const [team, setTeam] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTarget, setViewTarget] = useState<Employee | null>(null);

  useEffect(() => {
    employeesApi
      .list()
      .then(setTeam)
      .catch(() => { })
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
              onClick={() => setViewTarget(emp)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--primary-light)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <UserIcon size={20} style={{ color: "var(--primary-color)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: "var(--text)", fontSize: 14 }}>
                    {emp.full_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {emp.employee_code} · {emp.designation ?? "Employee"}
                  </div>
                </div>
                <Eye size={16} style={{ color: "var(--text-muted)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Reviews Modal */}
      {viewTarget && (
        <ViewReviewsModal
          employee={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}

// ------- View Reviews Modal (read-only) -------

function ViewReviewsModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    performanceApi
      .list(employee.id)
      .then(setReviews)
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [employee.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{employee.full_name} — Reviews</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          {loading && <p className="muted">Loading...</p>}
          {!loading && reviews.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <Star size={32} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                No performance reviews found for {employee.full_name}.
              </p>
            </div>
          )}
          {!loading && reviews.length > 0 && (
            <div className="stack">
              {reviews.map((review) => (
                <div key={review.id} style={{ paddingBottom: 16, borderBottom: "1px solid hsl(var(--border))", marginBottom: 16 }}>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <strong>{review.review_period ?? "Review"}</strong>
                    {review.rating && (
                      <span className="badge badge-solid">{review.rating} / 5</span>
                    )}
                  </div>
                  <div className="detail-grid" style={{ gap: 8 }}>
                    <div className="detail-item">
                      <div className="detail-label">Date</div>
                      <div className="detail-value">{review.review_date ?? "—"}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Reviewer</div>
                      <div className="detail-value">{review.reviewer_name ?? "—"}</div>
                    </div>
                    {review.strengths && (
                      <div className="detail-item">
                        <div className="detail-label">Strengths</div>
                        <div className="detail-value">{review.strengths}</div>
                      </div>
                    )}
                    {review.areas_for_improvement && (
                      <div className="detail-item">
                        <div className="detail-label">Improvements</div>
                        <div className="detail-value">{review.areas_for_improvement}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
