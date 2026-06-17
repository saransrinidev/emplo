import { useEffect, useState } from "react";
import { Star, User as UserIcon, X, ThumbsUp, TrendingUp, MessageSquare, Calendar, Eye } from "lucide-react";
import { employeesApi, type Employee } from "../api/employees";
import { performanceApi } from "../api/performance";
import type { PerformanceReview } from "../api/performance";
import { useAuth } from "../context/AuthContext";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

function RatingStars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={15}
          fill={i <= rating ? "#f59e0b" : "none"}
          style={{ color: i <= rating ? "#f59e0b" : "var(--text-muted)" }}
        />
      ))}
    </div>
  );
}

function ratingLabel(rating: number): string {
  if (rating >= 5) return "Outstanding";
  if (rating >= 4) return "Exceeds Expectations";
  if (rating >= 3) return "Meets Expectations";
  if (rating >= 2) return "Needs Improvement";
  return "Unsatisfactory";
}

export default function Performance() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  return (
    <div>
      <PageHeader
        title="Performance Reviews"
        subtitle={isManager ? "Your personal reviews and your team's performance." : "Your performance review history and ratings."}
      />
      <MyPerformance />
      {isManager && <TeamPerformance />}
    </div>
  );
}

/* ── My Performance ── */
function MyPerformance() {
  const { data, loading, error } = useApi(() => performanceApi.list());
  const reviews = data ?? [];
  const avg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div style={{ marginBottom: 40 }}>
      {/* Stats bar */}
      {reviews.length > 0 && (
        <div className="perf-stats-row">
          <div className="perf-stat-card">
            <div className="perf-stat-icon" style={{ background: "rgba(245,158,11,.1)", color: "#f59e0b" }}><Star size={18} /></div>
            <div>
              <div className="perf-stat-val">{avg}</div>
              <div className="perf-stat-lbl">Avg Rating</div>
            </div>
          </div>
          <div className="perf-stat-card">
            <div className="perf-stat-icon" style={{ background: "rgba(99,102,241,.1)", color: "#6366f1" }}><MessageSquare size={18} /></div>
            <div>
              <div className="perf-stat-val">{reviews.length}</div>
              <div className="perf-stat-lbl">Total Reviews</div>
            </div>
          </div>
          <div className="perf-stat-card">
            <div className="perf-stat-icon" style={{ background: "rgba(16,185,129,.1)", color: "#10b981" }}><TrendingUp size={18} /></div>
            <div>
              <div className="perf-stat-val">{reviews.filter((r) => Number(r.rating) >= 4).length}</div>
              <div className="perf-stat-lbl">High Ratings</div>
            </div>
          </div>
        </div>
      )}

      <div className="perf-section-label">My Reviews</div>
      <AsyncState loading={loading} error={error}>
        {reviews.length === 0 ? (
          <div className="perf-empty">
            <Star size={44} style={{ color: "var(--text-muted)" }} />
            <div style={{ fontWeight: 600, fontSize: 15 }}>No reviews yet</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Your performance reviews will appear here.</div>
          </div>
        ) : (
          <div className="perf-reviews-list">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </AsyncState>
    </div>
  );
}

/* ── Review Card ── */
function ReviewCard({ review }: { review: PerformanceReview }) {
  const rating = Number(review.rating) || 0;
  return (
    <div className="perf-review-card">
      <div className="perf-review-header">
        <div>
          <div className="perf-review-period">{review.review_period ?? "Performance Review"}</div>
          <div className="perf-review-meta">
            <Calendar size={12} /> {review.review_date ?? "—"}
            {review.reviewer_name && <> · by {review.reviewer_name}</>}
          </div>
        </div>
        {rating > 0 && (
          <div className="perf-rating-block">
            <RatingStars rating={rating} />
            <div className="perf-rating-label">{ratingLabel(rating)}</div>
            <div className="perf-rating-score">{rating}/5</div>
          </div>
        )}
      </div>

      {(review.strengths || review.areas_for_improvement) && (
        <div className="perf-review-body">
          {review.strengths && (
            <div className="perf-review-section">
              <div className="perf-review-section-label"><ThumbsUp size={12} /> Strengths</div>
              <div className="perf-review-section-text">{review.strengths}</div>
            </div>
          )}
          {review.areas_for_improvement && (
            <div className="perf-review-section">
              <div className="perf-review-section-label"><TrendingUp size={12} /> Areas for Improvement</div>
              <div className="perf-review-section-text">{review.areas_for_improvement}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Team Performance (manager only) ── */
function TeamPerformance() {
  const [team, setTeam] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTarget, setViewTarget] = useState<Employee | null>(null);

  useEffect(() => {
    employeesApi.list().then(setTeam).catch(() => { }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="perf-section-label">Team Members</div>
      {loading && <p className="muted">Loading team…</p>}
      {!loading && team.length === 0 && <p className="muted">No direct reports assigned to you.</p>}
      {!loading && team.length > 0 && (
        <div className="perf-team-grid">
          {team.map((emp) => {
            const initials = emp.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={emp.id} className="perf-team-card" onClick={() => setViewTarget(emp)}>
                <div className="perf-team-avatar">{initials}</div>
                <div className="perf-team-info">
                  <div className="perf-team-name">{emp.full_name}</div>
                  <div className="perf-team-meta">{emp.employee_code} · {emp.designation ?? "Employee"}</div>
                </div>
                <div className="perf-team-view-icon"><Eye size={16} /></div>
              </div>
            );
          })}
        </div>
      )}
      {viewTarget && <ViewReviewsModal employee={viewTarget} onClose={() => setViewTarget(null)} />}
    </div>
  );
}

/* ── View Reviews Modal ── */
function ViewReviewsModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    performanceApi.list(employee.id).then(setReviews).catch(() => { }).finally(() => setLoading(false));
  }, [employee.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserIcon size={18} style={{ color: "var(--primary-color)" }} />
            {employee.full_name} — Reviews
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 20, maxHeight: "70vh", overflowY: "auto" }}>
          {loading && <p className="muted">Loading…</p>}
          {!loading && reviews.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <Star size={36} style={{ color: "var(--text-muted)", marginBottom: 10 }} />
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No performance reviews found.</p>
            </div>
          )}
          {!loading && reviews.length > 0 && (
            <div className="perf-reviews-list">
              {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
