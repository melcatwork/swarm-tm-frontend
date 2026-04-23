/**
 * ThreatModelSummary Component
 *
 * High-level summary of threat model results displaying:
 * - Total attack paths discovered
 * - Coverage details (for stigmergic swarm)
 * - Overall risk levels
 * - Primary and alternate attack paths risk levels
 */

import { Target, Shield, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

const BAND_COLOURS = {
  'Low':         '#FFEB3B',
  'Medium':      '#F4A460',
  'Medium-High': '#FF8C00',
  'High':        '#B71C1C',
  'Very High':   '#F44336',
}

const BANDS_ORDER = ['Very High', 'High', 'Medium-High', 'Medium', 'Low']

export default function ThreatModelSummary({ result }) {
  if (!result) return null

  // Get paths
  const allPaths = result.csa_risk_assessment?.scored_paths || result.final_paths || []
  const confirmedVulnPaths = allPaths.filter(p => p.source === 'confirmed_vuln_synthesis')
  const agentExplorationPaths = allPaths.filter(p => p.source !== 'confirmed_vuln_synthesis')

  // Calculate risk distribution for confirmed vuln paths
  const confirmedRiskDistribution = {}
  let highestConfirmedBand = 'Low'
  let highestConfirmedBandScore = 0

  confirmedVulnPaths.forEach(path => {
    const riskBand = path.csa_risk_score?.risk_band || 'Low'
    confirmedRiskDistribution[riskBand] = (confirmedRiskDistribution[riskBand] || 0) + 1

    const riskLevel = path.csa_risk_score?.risk_level || 0
    const bandOrder = ['Low', 'Medium', 'Medium-High', 'High', 'Very High']
    const currentBandIndex = bandOrder.indexOf(riskBand)
    const highestBandIndex = bandOrder.indexOf(highestConfirmedBand)

    if (currentBandIndex > highestBandIndex ||
        (currentBandIndex === highestBandIndex && riskLevel > highestConfirmedBandScore)) {
      highestConfirmedBand = riskBand
      highestConfirmedBandScore = riskLevel
    }
  })

  // Calculate overall risk distribution (all paths)
  const overallRiskDistribution = result.csa_risk_assessment?.risk_distribution || {}
  const highestOverallBand = overallRiskDistribution.highest_band ||
                              result.csa_risk_assessment?.highest_band ||
                              'Low'

  // Get coverage details (if available from stigmergic swarm)
  const coveragePercentage = result.emergent_insights?.summary?.coverage_percentage ||
                             result.adversarial_summary?.coverage_estimate

  // Impact configuration
  const impactConfig = result.csa_risk_assessment?.impact_configuration

  return (
    <div
      style={{
        borderRadius: 8,
        border: '2px solid var(--color-border-primary)',
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        padding: 20,
        marginBottom: 24,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Target size={24} style={{ color: '#667eea' }} />
          Threat Model Summary
        </h2>
        <p style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          margin: 0,
        }}>
          High-level overview of discovered attack paths and risk assessment
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 20,
      }}>
        {/* Total Attack Paths */}
        <div style={{
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: 8,
          padding: 16,
          border: '1px solid var(--color-border-secondary)',
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}>
            Total Attack Paths
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#667eea',
            lineHeight: 1,
            marginBottom: 8,
          }}>
            {allPaths.length}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-secondary)',
          }}>
            {confirmedVulnPaths.length} vulnerability-grounded, {agentExplorationPaths.length} agent exploration
          </div>
        </div>

        {/* Primary & Alternate Paths */}
        <div style={{
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: 8,
          padding: 16,
          border: `2px solid ${BAND_COLOURS[highestConfirmedBand]}60`,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}>
            Primary & Alternate Paths
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: BAND_COLOURS[highestConfirmedBand],
            lineHeight: 1,
            marginBottom: 8,
          }}>
            {confirmedVulnPaths.length}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: BAND_COLOURS[highestConfirmedBand],
            }} />
            Highest risk: <strong style={{ color: BAND_COLOURS[highestConfirmedBand] }}>{highestConfirmedBand}</strong>
          </div>
        </div>

        {/* Overall Highest Risk */}
        <div style={{
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: 8,
          padding: 16,
          border: `2px solid ${BAND_COLOURS[highestOverallBand]}60`,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}>
            Overall Highest Risk
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: BAND_COLOURS[highestOverallBand],
            lineHeight: 1.2,
            marginBottom: 8,
          }}>
            {highestOverallBand}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-secondary)',
          }}>
            Across all {allPaths.length} attack paths
          </div>
        </div>

        {/* Coverage Percentage (if available) */}
        {coveragePercentage && (
          <div style={{
            backgroundColor: 'var(--color-background-secondary)',
            borderRadius: 8,
            padding: 16,
            border: '1px solid #10b98160',
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 8,
            }}>
              Attack Surface Coverage
            </div>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#10b981',
              lineHeight: 1,
              marginBottom: 8,
            }}>
              {typeof coveragePercentage === 'number'
                ? `${coveragePercentage.toFixed(1)}%`
                : coveragePercentage}
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
            }}>
              Exploration completeness
            </div>
          </div>
        )}
      </div>

      {/* Risk Distribution - Primary & Alternate Paths */}
      {confirmedVulnPaths.length > 0 && (
        <div style={{
          backgroundColor: 'var(--color-background-secondary)',
          borderRadius: 8,
          padding: 16,
          border: '1px solid var(--color-border-secondary)',
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Shield size={16} style={{ color: '#667eea' }} />
            Primary & Alternate Attack Paths Risk Distribution
          </div>
          <div style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            {BANDS_ORDER.map(band => {
              const count = confirmedRiskDistribution[band] || 0
              if (count === 0) return null
              return (
                <div
                  key={band}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
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
                      fontSize: 14,
                      fontWeight: 700,
                      color: BAND_COLOURS[band],
                    }}
                  >
                    {count}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {band}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Overall Risk Distribution */}
      <div style={{
        backgroundColor: 'var(--color-background-secondary)',
        borderRadius: 8,
        padding: 16,
        border: '1px solid var(--color-border-secondary)',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <TrendingUp size={16} style={{ color: '#667eea' }} />
          Overall Risk Distribution (All Attack Paths)
        </div>
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          {BANDS_ORDER.map(band => {
            const count = overallRiskDistribution[band] || 0
            if (count === 0) return null
            return (
              <div
                key={band}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
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
                    fontSize: 14,
                    fontWeight: 700,
                    color: BAND_COLOURS[band],
                  }}
                >
                  {count}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  {band}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Impact Configuration */}
      {impactConfig && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 6,
          border: '1px solid var(--color-border-tertiary)',
          backgroundColor: 'var(--color-background-primary)',
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertTriangle size={14} style={{ color: '#667eea', flexShrink: 0 }} />
          <div>
            <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              Data classification (impact):
            </span>{' '}
            <span style={{
              fontWeight: 700,
              color: BAND_COLOURS[
                ['', 'Low', 'Medium', 'Medium-High', 'High', 'Very High'][impactConfig.user_set_score]
              ] || '#888',
            }}>
              {impactConfig.user_set_score} — {impactConfig.label}
            </span>
            <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 6 }}>
              (applies to all paths)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
