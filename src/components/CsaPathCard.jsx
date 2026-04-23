/**
 * CsaPathCard Component
 *
 * Main attack path card displaying comprehensive CSA CII risk assessment
 * with risk band, likelihood/impact scores, D/E/R sub-factors, CIA
 * classification, and expandable attack steps.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const BAND_COLOURS = {
  'Low':         '#FFEB3B',
  'Medium':      '#F4A460',
  'Medium-High': '#FF8C00',
  'High':        '#B71C1C',
  'Very High':   '#F44336',
}

const CIA_COLOURS = {
  Confidentiality: '#5B4FBE',
  Integrity:       '#1A7A4A',
  Availability:    '#B45309',
}

const DEFENSE_LAYER_COLOURS = {
  preventive: { bg: '#dcfce7', border: '#166534', text: '#166534', label: 'Preventive' },
  detective: { bg: '#dbeafe', border: '#1e40af', text: '#1e40af', label: 'Detective' },
  administrative: { bg: '#e9d5ff', border: '#6b21a8', text: '#6b21a8', label: 'Administrative' },
  response: { bg: '#fed7aa', border: '#9a3412', text: '#9a3412', label: 'Response' },
  recovery: { bg: '#fef3c7', border: '#92400e', text: '#92400e', label: 'Recovery' },
}

function SubFactorBar({ label, score, rationale }) {
  const width = (score / 5) * 100
  const colour =
    score >= 4 ? '#F44336'
    : score === 3 ? '#FF8C00'
    : '#1A7A4A'

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          marginBottom: 2,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
          }}
        >
          {label}
        </span>
        <span style={{ fontWeight: 700, color: colour }}>
          {score} / 5
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: 'var(--color-border-tertiary)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            backgroundColor: colour,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {rationale && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {rationale}
        </div>
      )}
    </div>
  )
}

function StepRow({ step, index, pathId, selectedMitigations, toggleMitigationSelection }) {
  const formatTechniqueUrl = (techniqueId) => {
    const formatted = techniqueId.replace('.', '/')
    return `https://attack.mitre.org/techniques/${formatted}/`
  }

  // Get mitigations organized by defense layer
  const mitigationsByLayer = step.mitigations_by_layer || {}
  const hasMitigations = Object.keys(mitigationsByLayer).length > 0

  const stepNumber = step.step_number || index + 1

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '6px 0',
        borderBottom: '1px solid var(--color-border-tertiary)',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          minWidth: 22,
          height: 22,
          borderRadius: '50%',
          backgroundColor: 'var(--color-background-secondary)',
          border: '1px solid var(--color-border-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--color-text-secondary)',
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 2,
          }}
        >
          <a
            href={formatTechniqueUrl(step.technique_id)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#3b82f6',
              fontFamily: 'monospace',
              textDecoration: 'none',
            }}
          >
            {step.technique_id}
          </a>
          <span
            style={{
              fontSize: 11,
              color: 'var(--color-text-secondary)',
            }}
          >
            {step.technique_name}
          </span>
          {step.is_gap_filler && (
            <span
              style={{
                fontSize: 9,
                backgroundColor: 'var(--color-background-secondary)',
                color: 'var(--color-text-tertiary)',
                padding: '1px 5px',
                borderRadius: 3,
                border: '1px solid var(--color-border-tertiary)',
              }}
            >
              inferred
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            marginBottom: 2,
          }}
        >
          <strong>Target:</strong> {step.asset_id || step.target_asset || step.resource_id}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--color-text-secondary)',
            marginBottom: 2,
          }}
        >
          {step.action_description || step.description}
        </div>
        {step.outcome && (
          <div
            style={{
              fontSize: 11,
              color: '#1a1a2e',
              fontWeight: 600,
              backgroundColor: '#fef3c7',
              padding: '4px 8px',
              borderRadius: 4,
              marginTop: 4,
              border: '1px solid #fbbf24',
            }}
          >
            <span style={{ color: '#92400e' }}>Outcome:</span> {step.outcome}
          </div>
        )}
        {step.detection_gap && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
              fontStyle: 'italic',
              marginTop: 4,
            }}
          >
            Detection gap: {step.detection_gap}
          </div>
        )}

        {/* Mitigations Display - Always Visible */}
        {hasMitigations && (
          <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid #e2e8f0' }}>
            {['preventive', 'detective', 'administrative', 'response', 'recovery'].map(layer => {
              const layerMitigations = mitigationsByLayer[layer]
              if (!layerMitigations || layerMitigations.length === 0) return null

              const layerConfig = DEFENSE_LAYER_COLOURS[layer]

              return (
                <div key={layer} style={{ marginBottom: 12 }}>
                  {/* Layer Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 6,
                      padding: '4px 8px',
                      backgroundColor: layerConfig.bg,
                      border: `1px solid ${layerConfig.border}`,
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: layerConfig.border,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: layerConfig.text,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {layerConfig.label} ({layerMitigations.length})
                    </span>
                  </div>

                  {/* Mitigations List */}
                  {layerMitigations.map((mitigation, idx) => {
                    const mitigationKey = `${pathId}:${stepNumber}:${mitigation.mitigation_name}`
                    const isSelected = selectedMitigations?.[mitigationKey] || false

                    return (
                    <div
                      key={idx}
                      style={{
                        marginBottom: 8,
                        marginLeft: 12,
                        padding: '8px 10px',
                        backgroundColor: isSelected ? `${layerConfig.bg}40` : 'var(--color-background-secondary)',
                        borderRadius: 4,
                        borderLeft: `3px solid ${layerConfig.border}`,
                        border: isSelected ? `1px solid ${layerConfig.border}` : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Mitigation Name and Priority */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                          {toggleMitigationSelection && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleMitigationSelection(pathId, stepNumber, mitigation.mitigation_name)
                              }}
                              style={{
                                width: 16,
                                height: 16,
                                marginTop: 1,
                                cursor: 'pointer',
                                accentColor: layerConfig.border,
                              }}
                              title="Select mitigation for post-mitigation analysis"
                            />
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: layerConfig.text,
                              flex: 1,
                            }}
                          >
                            {mitigation.mitigation_name}
                          </span>
                        </div>
                        {mitigation.priority && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: 3,
                              backgroundColor: mitigation.priority === 'critical' ? '#fee2e2' : '#fef3c7',
                              color: mitigation.priority === 'critical' ? '#991b1b' : '#92400e',
                              textTransform: 'uppercase',
                              marginLeft: 8,
                            }}
                          >
                            {mitigation.priority}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--color-text-secondary)',
                          lineHeight: 1.5,
                          marginBottom: 6,
                        }}
                      >
                        {mitigation.description}
                      </div>

                      {/* AWS Service Action */}
                      {mitigation.aws_service_action && (
                        <div
                          style={{
                            fontSize: 10,
                            color: layerConfig.text,
                            backgroundColor: `${layerConfig.bg}80`,
                            padding: '4px 8px',
                            borderRadius: 3,
                            marginBottom: 4,
                          }}
                        >
                          <strong>AWS Action:</strong> {mitigation.aws_service_action}
                        </div>
                      )}

                      {/* Implementation Effort and Effectiveness */}
                      <div
                        style={{
                          display: 'flex',
                          gap: 12,
                          fontSize: 9,
                          color: 'var(--color-text-tertiary)',
                        }}
                      >
                        {mitigation.implementation_effort && (
                          <span>
                            <strong>Effort:</strong> {mitigation.implementation_effort}
                          </span>
                        )}
                        {mitigation.effectiveness && (
                          <span>
                            <strong>Effectiveness:</strong> {mitigation.effectiveness}
                          </span>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CsaPathCard({
  path,
  defaultExpanded = false,
  selectedMitigations = {},
  toggleMitigationSelection = null,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showSubFactors, setShowSubFactors] = useState(false)

  const csaScore = path.csa_risk_score || {}
  const likelihood = csaScore.likelihood || {}
  const impact = csaScore.impact || {}
  const subFactors = likelihood.sub_factors || {}
  const riskScenario = path.risk_scenario || csaScore.risk_scenario || {}
  const riskRegister = path.risk_register_entry || csaScore.risk_register_entry || {}

  // Original risk
  const band = csaScore.risk_band || 'Medium'
  const riskLevel = csaScore.risk_level
  const bandColour = BAND_COLOURS[band] || '#888'

  // Residual risk (post-mitigation)
  const residualScore = path.residual_csa_risk_score || null
  const residualBand = residualScore?.risk_band
  const residualRiskLevel = residualScore?.risk_level
  const residualBandColour = residualBand ? BAND_COLOURS[residualBand] || '#888' : null
  const hasResidualRisk = residualScore !== null

  const steps = path.steps || []
  const cia = csaScore.cia_classification || []
  const actorName = path.persona_id || path.threat_actor || path.source || 'Swarm'
  const pathId = path.path_id || path.id || path.name

  // Determine header background color - use darker background for yellow "Low" risk to improve contrast
  const getHeaderBackgroundColor = () => {
    if (hasResidualRisk && residualBand === 'Low') {
      // For Low (yellow) residual risk, use a darker background for better contrast
      return '#8B7D3A15' // Dark olive/brown tint with low opacity
    }
    return `${bandColour}12` // Default: 12% opacity of original band color
  }

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${bandColour}40`,
        backgroundColor: 'var(--color-background-primary)',
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header strip */}
      <div
        style={{
          backgroundColor: getHeaderBackgroundColor(),
          borderBottom: `2px solid ${bandColour}`,
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 6,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {path.name || path.path_name || path.path_id}
          </div>

          {/* Risk badge row */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Original Band + score */}
            {hasResidualRisk && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--color-text-tertiary)',
                  textDecoration: 'line-through',
                  marginRight: -4,
                }}
              >
                Original:
              </span>
            )}
            <span
              style={{
                backgroundColor: bandColour,
                color: '#fff',
                padding: '3px 10px',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 12,
                opacity: hasResidualRisk ? 0.6 : 1,
                textDecoration: hasResidualRisk ? 'line-through' : 'none',
              }}
            >
              {band}
            </span>
            {riskLevel !== undefined && (
              <span
                style={{
                  fontWeight: 700,
                  color: bandColour,
                  fontSize: 13,
                  opacity: hasResidualRisk ? 0.6 : 1,
                  textDecoration: hasResidualRisk ? 'line-through' : 'none',
                }}
              >
                {riskLevel} / 25
              </span>
            )}

            {/* Residual Band + score (if available) */}
            {hasResidualRisk && (
              <>
                <span
                  style={{
                    fontSize: 12,
                    color: '#10b981',
                    fontWeight: 700,
                  }}
                >
                  →
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: '#10b981',
                    fontWeight: 600,
                  }}
                >
                  Residual:
                </span>
                <span
                  style={{
                    backgroundColor: residualBandColour,
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 12,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {residualBand}
                </span>
                {residualRiskLevel !== undefined && (
                  <span
                    style={{
                      fontWeight: 700,
                      color: residualBandColour,
                      fontSize: 13,
                    }}
                  >
                    {residualRiskLevel} / 25
                  </span>
                )}
              </>
            )}

            {/* Divider */}
            <span
              style={{
                color: 'var(--color-border-secondary)',
              }}
            >
              |
            </span>

            {/* Actor */}
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-text-secondary)',
              }}
            >
              Actor:
              <span
                style={{
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginLeft: 4,
                }}
              >
                {actorName}
              </span>
            </span>

            {/* Divider */}
            <span
              style={{
                color: 'var(--color-border-secondary)',
              }}
            >
              |
            </span>

            {/* CIA tags */}
            {cia.length > 0 && (
              <>
                {cia.map(c => (
                  <span
                    key={c}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#fff',
                      backgroundColor: CIA_COLOURS[c],
                      padding: '2px 6px',
                      borderRadius: 3,
                    }}
                  >
                    {c.slice(0, 1)}
                  </span>
                ))}
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {cia.join(' / ')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Likelihood / Impact / D-E-R summary */}
        <div
          style={{
            textAlign: 'right',
            flexShrink: 0,
            fontSize: 11,
          }}
        >
          {likelihood.score && (
            <div style={{ color: 'var(--color-text-secondary)' }}>
              Likelihood:{' '}
              <strong>
                {likelihood.score} — {likelihood.label}
              </strong>
            </div>
          )}
          {impact.score && (
            <div style={{ color: 'var(--color-text-secondary)' }}>
              Impact:{' '}
              <strong>
                {impact.score} — {impact.label}
              </strong>
            </div>
          )}
          {subFactors.discoverability && (
            <div
              style={{
                marginTop: 4,
                color: 'var(--color-text-tertiary)',
              }}
            >
              D:{subFactors.discoverability.score}{' '}
              E:{subFactors.exploitability.score}{' '}
              R:{subFactors.reproducibility.score}
            </div>
          )}
          <div
            style={{
              marginTop: 4,
              fontSize: 10,
              color: 'var(--color-text-tertiary)',
            }}
          >
            {expanded ? '▲ collapse' : '▼ expand'}
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '12px 14px' }}>

          {/* CSA Risk Details row */}
          {(likelihood.score || impact.score || riskLevel) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                marginBottom: 14,
                padding: 12,
                backgroundColor:
                  'var(--color-background-secondary)',
                borderRadius: 6,
              }}
            >
              {/* Likelihood column */}
              {likelihood.score && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-tertiary)',
                      letterSpacing: '0.08em',
                      marginBottom: 6,
                    }}
                  >
                    Likelihood
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: bandColour,
                      lineHeight: 1,
                    }}
                  >
                    {likelihood.score}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'var(--color-text-secondary)',
                        marginLeft: 4,
                      }}
                    >
                      / 5
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {likelihood.label}
                  </div>
                </div>
              )}

              {/* Impact column */}
              {impact.score && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-tertiary)',
                      letterSpacing: '0.08em',
                      marginBottom: 6,
                    }}
                  >
                    Impact (user-set)
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: bandColour,
                      lineHeight: 1,
                    }}
                  >
                    {impact.score}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'var(--color-text-secondary)',
                        marginLeft: 4,
                      }}
                    >
                      / 5
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {impact.label}
                  </div>
                </div>
              )}

              {/* Risk level column */}
              {riskLevel !== undefined && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-text-tertiary)',
                      letterSpacing: '0.08em',
                      marginBottom: 6,
                    }}
                  >
                    Risk level
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: bandColour,
                      lineHeight: 1,
                    }}
                  >
                    {riskLevel}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'var(--color-text-secondary)',
                        marginLeft: 4,
                      }}
                    >
                      / 25
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      backgroundColor: bandColour,
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {band}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Residual CSA Risk Details row (Post-Mitigation) */}
          {hasResidualRisk && residualScore && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                marginBottom: 14,
                padding: 12,
                backgroundColor: '#10b98110',
                border: '1px solid #10b98140',
                borderRadius: 6,
              }}
            >
              {/* Residual Likelihood column */}
              {residualScore.likelihood && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#059669',
                      letterSpacing: '0.08em',
                      marginBottom: 6,
                    }}
                  >
                    Residual Likelihood
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: residualBandColour,
                      lineHeight: 1,
                    }}
                  >
                    {residualScore.likelihood.score}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'var(--color-text-secondary)',
                        marginLeft: 4,
                      }}
                    >
                      / 5
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {residualScore.likelihood.label}
                  </div>
                </div>
              )}

              {/* Residual Impact column (unchanged from original) */}
              {residualScore.impact && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#059669',
                      letterSpacing: '0.08em',
                      marginBottom: 6,
                    }}
                  >
                    Residual Impact
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: residualBandColour,
                      lineHeight: 1,
                    }}
                  >
                    {residualScore.impact.score}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'var(--color-text-secondary)',
                        marginLeft: 4,
                      }}
                    >
                      / 5
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    {residualScore.impact.label}
                  </div>
                </div>
              )}

              {/* Residual Risk level column */}
              {residualRiskLevel !== undefined && (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#059669',
                      letterSpacing: '0.08em',
                      marginBottom: 6,
                    }}
                  >
                    Residual Risk Level
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: residualBandColour,
                      lineHeight: 1,
                    }}
                  >
                    {residualRiskLevel}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'var(--color-text-secondary)',
                        marginLeft: 4,
                      }}
                    >
                      / 25
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      backgroundColor: residualBandColour,
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {residualBand}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* CIA classification */}
          {cia.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 6,
                }}
              >
                CIA Impact Classification
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['Confidentiality', 'Integrity', 'Availability']
                  .map(c => {
                    const active = cia.includes(c)
                    return (
                      <div
                        key={c}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 4,
                          border: active
                            ? `1px solid ${CIA_COLOURS[c]}`
                            : '1px solid var(--color-border-tertiary)',
                          backgroundColor: active
                            ? `${CIA_COLOURS[c]}15`
                            : 'transparent',
                          opacity: active ? 1 : 0.35,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: active
                              ? CIA_COLOURS[c]
                              : 'var(--color-border-secondary)',
                            display: 'inline-block',
                            marginRight: 6,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: active ? 600 : 400,
                            color: active
                              ? CIA_COLOURS[c]
                              : 'var(--color-text-tertiary)',
                          }}
                        >
                          {c}
                        </span>
                      </div>
                    )
                  })}
              </div>
              {impact.rationale && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    marginTop: 6,
                    fontStyle: 'italic',
                  }}
                >
                  {impact.rationale}
                </div>
              )}
            </div>
          )}

          {/* Sub-factor detail toggle */}
          {subFactors.discoverability && (
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowSubFactors(s => !s); }}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-border-tertiary)',
                  borderRadius: 4,
                  padding: '4px 10px',
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  marginBottom: showSubFactors ? 10 : 0,
                }}
              >
                {showSubFactors
                  ? '▲ Hide likelihood sub-factors'
                  : '▼ Show likelihood sub-factors (D / E / R)'}
              </button>

              {showSubFactors && (
                <div
                  style={{
                    padding: 12,
                    backgroundColor:
                      'var(--color-background-secondary)',
                    borderRadius: 6,
                  }}
                >
                  <SubFactorBar
                    label={`Discoverability — ${subFactors.discoverability.score}/5`}
                    score={subFactors.discoverability.score}
                    rationale={
                      subFactors.discoverability.rationale
                      || subFactors.discoverability.descriptor
                    }
                  />
                  <SubFactorBar
                    label={`Exploitability — ${subFactors.exploitability.score}/5`}
                    score={subFactors.exploitability.score}
                    rationale={
                      subFactors.exploitability.rationale
                      || subFactors.exploitability.descriptor
                    }
                  />
                  <SubFactorBar
                    label={`Reproducibility — ${subFactors.reproducibility.score}/5`}
                    score={subFactors.reproducibility.score}
                    rationale={
                      subFactors.reproducibility.rationale
                      || subFactors.reproducibility.descriptor
                    }
                  />
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 10,
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    Likelihood score = average(D, E, R) rounded
                    = {likelihood.score} ({likelihood.label}).
                    Source: CSA CII Risk Assessment Guide
                    Feb 2021, Section 4.2 Task A.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Risk scenario */}
          {(riskScenario.threat_event || riskScenario.asset) && (
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 6,
                }}
              >
                Risk scenario
              </div>
              <div
                style={{
                  padding: 10,
                  backgroundColor:
                    'var(--color-background-secondary)',
                  borderRadius: 6,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {riskScenario.threat_event && (
                  <div>
                    <strong>Threat event:</strong>{' '}
                    {riskScenario.threat_event}
                  </div>
                )}
                {riskScenario.vulnerability && (
                  <div>
                    <strong>Vulnerability:</strong>{' '}
                    {riskScenario.vulnerability}
                  </div>
                )}
                {riskScenario.asset && (
                  <div>
                    <strong>Asset:</strong>{' '}
                    {riskScenario.asset}
                  </div>
                )}
                {riskScenario.consequence && (
                  <div>
                    <strong>Consequence:</strong>{' '}
                    {riskScenario.consequence}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Risk register entry */}
          {(riskRegister.treatment_plan || csaScore.risk_tolerance_action) && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${bandColour}40`,
                backgroundColor: `${bandColour}08`,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: bandColour,
                  marginBottom: 4,
                }}
              >
                Risk tolerance action
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                {csaScore.risk_tolerance_action || riskRegister.treatment_plan}
              </div>
              {riskRegister.existing_measures && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  <strong>Existing measures / gaps:</strong>{' '}
                  {riskRegister.existing_measures}
                </div>
              )}
            </div>
          )}

          {/* Attack steps */}
          {steps.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 6,
                }}
              >
                Attack steps ({steps.length})
              </div>
              {steps.map((step, i) => (
                <StepRow
                  key={i}
                  step={step}
                  index={i}
                  pathId={pathId}
                  selectedMitigations={selectedMitigations}
                  toggleMitigationSelection={toggleMitigationSelection}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
