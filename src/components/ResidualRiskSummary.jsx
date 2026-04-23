/**
 * ResidualRiskSummary Component
 *
 * Summary header showing residual risk distribution after applying mitigations.
 * Displays post-mitigation risk levels in the same format as CSA CII Risk Assessment.
 */

const BAND_COLOURS = {
  'Low':         '#FFEB3B',
  'Medium':      '#F4A460',
  'Medium-High': '#FF8C00',
  'High':        '#B71C1C',
  'Very High':   '#F44336',
}

const BANDS_ORDER = [
  'Very High', 'High', 'Medium-High', 'Medium', 'Low'
]

export default function ResidualRiskSummary({ residualRiskAssessment, mitigationsApplied }) {
  if (!residualRiskAssessment) return null

  const {
    risk_distribution: dist,
    paths_scored: pathsScored,
    highest_band: highestBand,
    risk_reduction_percentage: riskReduction,
  } = residualRiskAssessment

  if (!dist) return null

  const highestColour = BAND_COLOURS[highestBand] || '#888'

  return (
    <div
      style={{
        borderRadius: 8,
        border: `2px solid ${highestColour}50`,
        backgroundColor: 'var(--color-background-secondary)',
        padding: 16,
        marginBottom: 20,
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ marginBottom: 3 }}>
            Residual Risk Assessment (Post-Mitigation)
          </h3>
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
            }}
          >
            CSA CII 5×5 Risk Matrix — After applying {mitigationsApplied} mitigation{mitigationsApplied !== 1 ? 's' : ''} on primary and alternate attack paths
          </div>
        </div>

        {/* Highest band badge */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
              marginBottom: 3,
            }}
          >
            Highest residual risk
          </div>
          <span
            style={{
              backgroundColor: highestColour,
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 4,
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {highestBand}
          </span>
        </div>
      </div>

      {/* Risk reduction banner */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 6,
          border: '1px solid #10b98160',
          backgroundColor: '#10b98110',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#10b981',
            }}
          >
            ↓ {riskReduction?.toFixed(1)}%
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#059669',
              }}
            >
              Overall Risk Reduction
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--color-text-tertiary)',
              }}
            >
              For primary and alternate attack paths
            </div>
          </div>
        </div>
      </div>

      {/* Distribution bar */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: 8,
          }}
        >
          Residual risk distribution — {pathsScored} paths re-scored
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {BANDS_ORDER.map(band => {
            const count = dist[band] || 0
            if (count === 0) return null
            return (
              <div
                key={band}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 4,
                  backgroundColor: `${BAND_COLOURS[band]}15`,
                  border: `1px solid ${BAND_COLOURS[band]}50`,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: BAND_COLOURS[band],
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: BAND_COLOURS[band],
                  }}
                >
                  {count}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {band}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tolerance action for highest band */}
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          borderTop: '1px solid var(--color-border-tertiary)',
          paddingTop: 10,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: highestColour }}>
          Required action ({highestBand}):
        </strong>{' '}
        {
          {
            'Very High':
              'Cannot be accepted. Activity must cease immediately '
              + 'or additional mitigations applied immediately.',
            'High':
              'Cannot be accepted. Additional treatment strategies must be '
              + 'developed and implemented within 1 month.',
            'Medium-High':
              'Cannot be accepted. Additional treatment strategies must be '
              + 'developed and implemented within 3–6 months.',
            'Medium':
              'Can be accepted with regular monitoring if no '
              + 'cost-effective treatment exists.',
            'Low':
              'Can be accepted with periodic monitoring.',
          }[highestBand]
        }
      </div>
    </div>
  )
}
