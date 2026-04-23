/**
 * CsaRiskSummary Component
 *
 * Summary header showing risk distribution across all paths
 * for the current threat model run. Displays CSA CII 5×5 risk
 * matrix assessment with highest risk band and distribution.
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

export default function CsaRiskSummary({ csaRiskAssessment }) {
  if (!csaRiskAssessment) return null

  const {
    impact_configuration: impactConfig,
    risk_distribution: dist,
    paths_scored: pathsScored,
    framework,
  } = csaRiskAssessment

  if (!dist) return null

  const highestBand = dist.highest_band || csaRiskAssessment.highest_band
  const highestColour = BAND_COLOURS[highestBand] || '#888'

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${highestColour}50`,
        backgroundColor:
          'var(--color-background-secondary)',
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
            CSA CII Risk Assessment
          </h3>
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
            }}
          >
            {framework}
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
            Highest risk band
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

      {/* Impact configuration */}
      {impactConfig && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--color-border-tertiary)',
            backgroundColor:
              'var(--color-background-primary)',
            marginBottom: 14,
            fontSize: 11,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: 'var(--color-text-secondary)',
            }}
          >
            Data classification (impact):
          </span>{' '}
          <span
            style={{
              fontWeight: 700,
              color: BAND_COLOURS[
                ['', 'Low', 'Medium', 'Medium-High', 'High', 'Very High'][
                  impactConfig.user_set_score
                ]
              ] || highestColour,
            }}
          >
            {impactConfig.user_set_score} — {impactConfig.label}
          </span>
          <span
            style={{
              color: 'var(--color-text-tertiary)',
              marginLeft: 8,
            }}
          >
            (operator-set before this run, applies to all paths)
          </span>
        </div>
      )}

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
          Risk distribution — {pathsScored} paths scored
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
                  backgroundColor:
                    `${BAND_COLOURS[band]}15`,
                  border:
                    `1px solid ${BAND_COLOURS[band]}50`,
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
              + 'or mitigation applied immediately.',
            'High':
              'Cannot be accepted. Treatment strategies must be '
              + 'developed and implemented within 1 month.',
            'Medium-High':
              'Cannot be accepted. Treatment strategies must be '
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
