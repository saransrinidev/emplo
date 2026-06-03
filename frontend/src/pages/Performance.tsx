import { performanceApi } from "../api/features";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

export default function Performance() {
  const { data, loading, error } = useApi(() => performanceApi.list());
  const reviews = data ?? [];

  return (
    <div>
      <PageHeader
        title="Performance Reviews"
        subtitle="Your review history and ratings."
      />
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
                    <div className="detail-value">
                      {review.areas_for_improvement ?? "—"}
                    </div>
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
