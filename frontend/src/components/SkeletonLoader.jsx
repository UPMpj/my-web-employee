import "./skeleton.css";

// rows — number of shimmer rows (table/list variants)
// cols — number of column blocks per row (table variant)
// count — number of cards (cards/idcard variants)
export default function SkeletonLoader({ variant = "table", rows = 7, cols = 5, count = 8 }) {
  if (variant === "table") {
    return (
      <div className="sk-table-wrap">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="sk-table-row">
            {[...Array(cols)].map((_, j) => (
              <div key={j} className="sk-block" style={{ flex: j === 0 ? "0 0 36px" : j === cols - 1 ? "0 0 80px" : 1 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="sk-cards-wrap">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="sk-card">
            <div className="sk-block sk-card-icon" />
            <div className="sk-block sk-card-title" />
            <div className="sk-block sk-card-line" />
            <div className="sk-block sk-card-line sk-short" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "building") {
    return (
      <div className="sk-building-wrap">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="sk-building-card">
            <div className="sk-block sk-building-icon" />
            <div style={{ flex: 1 }}>
              <div className="sk-block sk-building-title" />
              <div className="sk-block sk-building-sub" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "idcard") {
    return (
      <div className="sk-idcard-wrap">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="sk-idcard-item">
            <div className="sk-block sk-idcard-photo" />
            <div className="sk-block sk-idcard-name" />
            <div className="sk-block sk-idcard-sub" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="sk-detail-wrap">
        <div className="sk-detail-header">
          <div className="sk-block sk-detail-avatar" />
          <div className="sk-detail-header-info">
            <div className="sk-block sk-detail-name" />
            <div className="sk-block sk-detail-sub" />
            <div className="sk-block sk-detail-badge" />
          </div>
        </div>
        <div className="sk-detail-body">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="sk-detail-row">
              <div className="sk-block sk-detail-label" />
              <div className="sk-block sk-detail-value" style={{ width: `${55 + (i % 3) * 15}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className="sk-dashboard-wrap">
        <div className="sk-stat-row">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="sk-stat-card">
              <div className="sk-block sk-stat-icon" />
              <div className="sk-block sk-stat-num" />
              <div className="sk-block sk-stat-label" />
            </div>
          ))}
        </div>
        <div className="sk-chart-row">
          <div className="sk-block sk-chart-block" />
          <div className="sk-block sk-chart-block" />
        </div>
      </div>
    );
  }

  // variant === "rows" — simple stacked rows (for inline/panel loading)
  return (
    <div className="sk-rows-wrap">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="sk-row-item">
          <div className="sk-block" style={{ width: `${60 + (i % 4) * 10}%`, height: 14 }} />
        </div>
      ))}
    </div>
  );
}
