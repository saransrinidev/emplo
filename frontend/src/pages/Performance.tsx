import PageHeader from "../components/PageHeader";
import { reviews } from "../api/mockData";

export default function Performance() {
  return (
    <div>
      <PageHeader
        title="Performance Reviews"
        subtitle="Your review history and ratings."
      />
      <div className="stack">
        {reviews.map((review) => (
          <div key={review.id} className="card">
            <div className="row" style={{ marginBottom: 12 }}>
              <h2>{review.period}</h2>
              <span className="badge badge-solid">{review.rating}</span>
            </div>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Review Date</div>
                <div className="detail-value">{review.date}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Reviewer</div>
                <div className="detail-value">{review.reviewer}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Strengths</div>
                <div className="detail-value">{review.strengths}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Areas for Improvement</div>
                <div className="detail-value">{review.improvements}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
