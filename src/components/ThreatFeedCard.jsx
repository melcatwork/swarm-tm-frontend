import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { formatRelativeTime, getSeverityColor, getCategoryColor } from '../utils/formatters';
import './ThreatFeedCard.css';

function ThreatFeedCard({ item }) {
  const [showFullSummary, setShowFullSummary] = useState(false);

  const severityColor = getSeverityColor(item.severity);
  const categoryColor = getCategoryColor(item.category);

  // Truncate summary to approximately 3 lines (about 200 characters)
  const summaryText = item.summary || 'No summary available';
  const shouldTruncate = summaryText.length > 200;
  const displaySummary = showFullSummary ? summaryText : summaryText.substring(0, 200);

  return (
    <div className="threat-card" style={{ borderLeftColor: severityColor.border }}>
      <div className="threat-card-header">
        <div className="threat-card-badges">
          <span
            className="severity-badge"
            style={{
              backgroundColor: severityColor.bg,
              color: severityColor.text,
            }}
          >
            {item.severity.toUpperCase()}
          </span>
          <span
            className="category-badge"
            style={{
              backgroundColor: categoryColor.bg,
              color: categoryColor.text,
            }}
          >
            {item.category.toUpperCase()}
          </span>
        </div>
        <div className="threat-card-score">
          <span className="score-label">Score:</span>
          <span className="score-value">{item.citation_score.toFixed(1)}</span>
        </div>
      </div>

      <div className="threat-card-body">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="threat-card-title"
        >
          {item.title}
          <ExternalLink size={14} />
        </a>

        <div className="threat-card-meta">
          <span className="meta-source">{item.source}</span>
          <span className="meta-separator">•</span>
          <span className="meta-time">{formatRelativeTime(item.published)}</span>
        </div>

        <p className="threat-card-summary">
          {displaySummary}
          {shouldTruncate && !showFullSummary && '...'}
          {shouldTruncate && (
            <button
              className="summary-toggle"
              onClick={() => setShowFullSummary(!showFullSummary)}
            >
              {showFullSummary ? 'Show less' : 'Show more'}
            </button>
          )}
        </p>

        {(item.tags.length > 0 || item.cves.length > 0 || item.ttps.length > 0) && (
          <div className="threat-card-tags">
            {item.cves.map((cve) => (
              <span key={cve} className="tag tag-cve">
                {cve}
              </span>
            ))}
            {item.ttps.map((ttp) => (
              <span key={ttp} className="tag tag-ttp">
                {ttp}
              </span>
            ))}
            {item.tags.slice(0, 5).map((tag) => (
              <span key={tag} className="tag tag-default">
                {tag}
              </span>
            ))}
            {item.tags.length > 5 && (
              <span className="tag tag-more">+{item.tags.length - 5} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ThreatFeedCard;
