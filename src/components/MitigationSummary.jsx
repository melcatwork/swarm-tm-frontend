/**
 * MitigationSummary Component
 *
 * Displays comprehensive mitigation summary for all attack paths
 * with defense-in-depth grouping (Preventive, Detective, Administrative, Response, Recovery)
 */

import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp, AlertTriangle, Network } from 'lucide-react'
import './MitigationSummary.css'

const DEFENSE_LAYER_COLOURS = {
  preventive: { bg: '#dcfce7', border: '#166534', text: '#166534', label: 'Preventive', icon: '🛡️' },
  detective: { bg: '#dbeafe', border: '#1e40af', text: '#1e40af', label: 'Detective', icon: '🔍' },
  administrative: { bg: '#e9d5ff', border: '#6b21a8', text: '#6b21a8', label: 'Administrative', icon: '📋' },
  response: { bg: '#fed7aa', border: '#9a3412', text: '#9a3412', label: 'Response', icon: '⚡' },
  recovery: { bg: '#fef3c7', border: '#92400e', text: '#92400e', label: 'Recovery', icon: '♻️' },
}

export default function MitigationSummary({
  paths,
  title = "Comprehensive Mitigation Summary",
  selectedMitigations = {},
  toggleMitigationSelection = null,
}) {
  const [expandedPaths, setExpandedPaths] = useState(new Set([0])) // First path expanded by default
  const [expandedLayers, setExpandedLayers] = useState({})

  if (!paths || paths.length === 0) {
    return null
  }

  const togglePath = (pathIndex) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(pathIndex)) {
      newExpanded.delete(pathIndex)
    } else {
      newExpanded.add(pathIndex)
    }
    setExpandedPaths(newExpanded)
  }

  const toggleLayer = (pathIndex, layer) => {
    const key = `${pathIndex}-${layer}`
    setExpandedLayers(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Calculate total mitigations across all paths
  const totalMitigations = paths.reduce((sum, path) => {
    const steps = path.steps || []
    return sum + steps.reduce((stepSum, step) => {
      const mitigationsByLayer = step.mitigations_by_layer || {}
      return stepSum + Object.values(mitigationsByLayer).reduce(
        (layerSum, mitigations) => layerSum + (mitigations?.length || 0),
        0
      )
    }, 0)
  }, 0)

  // Group mitigations by defense layer across all paths
  const globalMitigationStats = {
    preventive: 0,
    detective: 0,
    administrative: 0,
    response: 0,
    recovery: 0,
  }

  paths.forEach(path => {
    const steps = path.steps || []
    steps.forEach(step => {
      const mitigationsByLayer = step.mitigations_by_layer || {}
      Object.entries(mitigationsByLayer).forEach(([layer, mitigations]) => {
        if (globalMitigationStats[layer] !== undefined) {
          globalMitigationStats[layer] += mitigations?.length || 0
        }
      })
    })
  })

  return (
    <div
      style={{
        borderRadius: 8,
        border: '1px solid var(--color-border-secondary)',
        backgroundColor: 'var(--color-background-secondary)',
        padding: 16,
        marginBottom: 20,
      }}
    >
      <div className="mitigation-summary-panel">
        <div className="mitigation-summary-header">
          <div className="summary-title-row">
            <Shield size={24} />
            <h3>{title}</h3>
          </div>
          <p className="summary-subtitle">
            Defense-in-depth mitigations organized by attack path and security layer
          </p>
        </div>

      {/* Global Stats Bar */}
      <div className="global-mitigation-stats">
        <div className="stat-item total">
          <span className="stat-value">{totalMitigations}</span>
          <span className="stat-label">Total Mitigations</span>
        </div>
        {Object.entries(globalMitigationStats).map(([layer, count]) => {
          const config = DEFENSE_LAYER_COLOURS[layer]
          return (
            <div key={layer} className="stat-item" style={{ borderColor: config.border }}>
              <span className="stat-icon">{config.icon}</span>
              <span className="stat-value" style={{ color: config.text }}>{count}</span>
              <span className="stat-label">{config.label}</span>
            </div>
          )
        })}
      </div>

      {/* Attack Paths List */}
      <div className="mitigation-paths-list">
        {(() => {
          // Separate paths by source
          const confirmedVulnPaths = paths.filter(p => p.source === 'confirmed_vuln_synthesis')
          const agentExplorationPaths = paths.filter(p => p.source !== 'confirmed_vuln_synthesis')

          const renderPathCard = (path, pathIndex) => {
          const isExpanded = expandedPaths.has(pathIndex)
          const pathName = path.name || path.path_name || `Attack Path ${pathIndex + 1}`
          const pathId = path.id || path.name || `path-${pathIndex}`
          const steps = path.steps || []

          // Collect all mitigations for this path, organized by layer
          const pathMitigationsByLayer = {
            preventive: [],
            detective: [],
            administrative: [],
            response: [],
            recovery: [],
          }

          steps.forEach((step, stepIndex) => {
            const mitigationsByLayer = step.mitigations_by_layer || {}
            Object.entries(mitigationsByLayer).forEach(([layer, mitigations]) => {
              if (pathMitigationsByLayer[layer]) {
                mitigations?.forEach(mitigation => {
                  pathMitigationsByLayer[layer].push({
                    ...mitigation,
                    stepNumber: step.step_number || stepIndex + 1,
                    techniqueId: step.technique_id,
                    techniqueName: step.technique_name,
                    targetAsset: step.asset_id || step.target_asset || step.resource_id,
                  })
                })
              }
            })
          })

          // Count total mitigations for this path
          const pathTotalMitigations = Object.values(pathMitigationsByLayer).reduce(
            (sum, mitigations) => sum + mitigations.length,
            0
          )

          return (
            <div key={pathIndex} className="mitigation-path-card">
              {/* Path Header */}
              <div
                className="path-header"
                onClick={() => togglePath(pathIndex)}
              >
                <div className="path-info">
                  <div className="path-number">Path {pathIndex + 1}</div>
                  <div className="path-name">{pathName}</div>
                  <div className="path-meta">
                    <span className="path-steps">{steps.length} steps</span>
                    <span className="path-mitigations">
                      <Shield size={14} />
                      {pathTotalMitigations} mitigations
                    </span>
                  </div>
                </div>
                <div className="expand-icon">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {/* Path Mitigations */}
              {isExpanded && (
                <div className="path-mitigations-content">
                  {['preventive', 'detective', 'administrative', 'response', 'recovery'].map(layer => {
                    const layerMitigations = pathMitigationsByLayer[layer]
                    if (!layerMitigations || layerMitigations.length === 0) return null

                    const config = DEFENSE_LAYER_COLOURS[layer]
                    const layerKey = `${pathIndex}-${layer}`
                    const isLayerExpanded = expandedLayers[layerKey]

                    return (
                      <div key={layer} className="defense-layer-section">
                        {/* Layer Header */}
                        <div
                          className="layer-header"
                          style={{
                            backgroundColor: config.bg,
                            borderLeft: `4px solid ${config.border}`,
                          }}
                          onClick={() => toggleLayer(pathIndex, layer)}
                        >
                          <div className="layer-title">
                            <span className="layer-icon">{config.icon}</span>
                            <span className="layer-name" style={{ color: config.text }}>
                              {config.label}
                            </span>
                            <span className="layer-count">
                              ({layerMitigations.length} mitigation{layerMitigations.length !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="layer-expand-icon">
                            {isLayerExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {/* Layer Mitigations */}
                        {isLayerExpanded && (
                          <div className="layer-mitigations">
                            {layerMitigations.map((mitigation, mitigationIndex) => {
                              const selectionKey = `${pathId}:${mitigation.stepNumber}:${mitigation.mitigation_name}`;
                              const isSelected = selectedMitigations[selectionKey] || false;

                              return (
                              <div
                                key={mitigationIndex}
                                className="mitigation-card"
                                style={{ borderLeftColor: config.border }}
                              >
                                {/* Mitigation Header */}
                                <div className="mitigation-header">
                                  <div className="mitigation-title-row">
                                    {toggleMitigationSelection && (
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleMitigationSelection(pathId, mitigation.stepNumber, mitigation.mitigation_name)}
                                        style={{
                                          width: 18,
                                          height: 18,
                                          marginRight: 12,
                                          cursor: 'pointer',
                                          accentColor: config.border,
                                        }}
                                      />
                                    )}
                                    <h4 className="mitigation-name">{mitigation.mitigation_name}</h4>
                                    {mitigation.priority && (
                                      <span
                                        className={`priority-badge priority-${mitigation.priority}`}
                                      >
                                        {mitigation.priority}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mitigation-context">
                                    <span className="context-step">Step {mitigation.stepNumber}</span>
                                    <span className="context-separator">•</span>
                                    <span className="context-technique">{mitigation.techniqueId}</span>
                                    <span className="context-separator">•</span>
                                    <span className="context-asset">{mitigation.targetAsset}</span>
                                  </div>
                                </div>

                                {/* Mitigation Description */}
                                <div className="mitigation-description">
                                  {mitigation.description}
                                </div>

                                {/* AWS Service Action */}
                                {mitigation.aws_service_action && (
                                  <div
                                    className="mitigation-aws-action"
                                    style={{
                                      backgroundColor: `${config.bg}80`,
                                      borderColor: config.border,
                                    }}
                                  >
                                    <strong style={{ color: config.text }}>AWS Action:</strong>
                                    <span>{mitigation.aws_service_action}</span>
                                  </div>
                                )}

                                {/* Mitigation Metadata */}
                                <div className="mitigation-metadata">
                                  {mitigation.implementation_effort && (
                                    <div className="metadata-item">
                                      <span className="metadata-label">Implementation Effort:</span>
                                      <span className="metadata-value">{mitigation.implementation_effort}</span>
                                    </div>
                                  )}
                                  {mitigation.effectiveness && (
                                    <div className="metadata-item">
                                      <span className="metadata-label">Effectiveness:</span>
                                      <span className="metadata-value">{mitigation.effectiveness}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
          }

          return (
            <>
              {/* Confirmed Vulnerability-Grounded Paths */}
              {confirmedVulnPaths.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 12,
                    color: 'var(--color-text-primary)'
                  }}>
                    Confirmed Vulnerability-Grounded Paths ({confirmedVulnPaths.length})
                  </h4>
                  {confirmedVulnPaths.map((path, i) => renderPathCard(path, i))}
                </div>
              )}

              {/* Agent Explorations - Collapsed by Default */}
              {agentExplorationPaths.length > 0 && (
                <AgentMitigationsSection paths={agentExplorationPaths} renderPathCard={renderPathCard} />
              )}
            </>
          )
        })()}
      </div>
    </div>
    </div>
  )
}

// Agent Explorations Collapsible Section for Mitigations
function AgentMitigationsSection({ paths, renderPathCard }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      border: '1px solid var(--color-border-secondary)',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 12
    }}>
      {/* Header - Clickable to Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: 'var(--color-background-secondary)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-background-tertiary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-background-secondary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Network size={16} style={{ color: 'var(--color-text-secondary)' }} />
          <span>Agent Explorations - {paths.length} path{paths.length !== 1 ? 's' : ''}</span>
        </div>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {/* Collapsed Content - Paths */}
      {expanded && (
        <div style={{ padding: '12px 16px' }}>
          <p style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginBottom: 12,
            lineHeight: 1.5
          }}>
            These mitigations correspond to attack paths discovered by threat actor persona agents
            during exploration. They represent defensive measures for creative attack scenarios.
          </p>
          {paths.map((path, i) => renderPathCard(path, i))}
        </div>
      )}
    </div>
  )
}
