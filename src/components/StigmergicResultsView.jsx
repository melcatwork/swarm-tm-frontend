/**
 * StigmergicResultsView Component
 *
 * Displays Phase 10 stigmergic swarm exploration results with:
 * - Swarm execution timeline
 * - Emergent insights panel
 * - Shared graph visualization
 * - Attack paths with swarm indicators
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Network, CheckCircle, TrendingUp, AlertCircle, Users, Shield, Copy } from 'lucide-react';
import SharedAttackGraph from './SharedAttackGraph';
import CsaRiskSummary from './CsaRiskSummary';
import CsaPathCard from './CsaPathCard';
import MitigationSummary from './MitigationSummary';
import { analyzePostMitigation } from '../api/client';
import './StigmergicResultsView.css';

const StigmergicResultsView = ({ results }) => {
  const [expandedSections, setExpandedSections] = useState({
    assetGraph: true,
    evaluation: true,
    timeline: true,
    insights: true,
    graph: true,
    paths: true
  });
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [expandedMitigations, setExpandedMitigations] = useState(new Set());
  const [selectedMitigations, setSelectedMitigations] = useState({});
  const [analyzingMitigations, setAnalyzingMitigations] = useState(false);
  const [toast, setToast] = useState(null);
  const [showAssetDetails, setShowAssetDetails] = useState(false);

  if (!results) return null;

  const {
    attack_paths = [],
    shared_graph_snapshot = {},
    emergent_insights = {},
    activity_log = [],
    personas_execution_sequence = [],
    execution_order = 'capability_ascending',
    asset_graph = {},
    evaluation_summary = {}
  } = results;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const togglePath = (index) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPaths(newExpanded);
  };

  const toggleMitigations = (index) => {
    const newExpanded = new Set(expandedMitigations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMitigations(newExpanded);
  };

  // Handle mitigation checkbox toggle
  const toggleMitigationSelection = (pathId, stepNumber, mitigationId) => {
    const key = `${pathId}:${stepNumber}:${mitigationId}`;
    setSelectedMitigations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Clear all mitigation selections
  const clearAllMitigations = () => {
    setSelectedMitigations({});
  };

  // Apply ALL mitigations and run post-mitigation analysis
  const applyAllMitigations = async () => {
    if (!attack_paths || attack_paths.length === 0) {
      setToast({
        message: 'No attack paths to analyze',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Build selectedMitigations object with ALL mitigations selected
    const allMitigations = {};
    const mitigationSelections = [];

    attack_paths.forEach(path => {
      const pathId = path.id || path.path_id || path.name;
      const steps = path.steps || [];

      steps.forEach((step, stepIndex) => {
        const stepNumber = step.step_number || stepIndex + 1;
        const mitigationsByLayer = step.mitigations_by_layer || {};

        Object.values(mitigationsByLayer).forEach(layerMitigations => {
          if (Array.isArray(layerMitigations)) {
            layerMitigations.forEach(mitigation => {
              const mitigationName = mitigation.mitigation_name;
              const key = `${pathId}:${stepNumber}:${mitigationName}`;

              allMitigations[key] = true;
              mitigationSelections.push({
                path_id: pathId,
                step_number: stepNumber,
                mitigation_id: mitigationName,
                selected: true
              });
            });
          }
        });
      });
    });

    // Update UI with all selections
    setSelectedMitigations(allMitigations);

    if (mitigationSelections.length === 0) {
      setToast({
        message: 'No mitigations found to apply',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Show count to user
    setToast({
      message: `Applying all ${mitigationSelections.length} mitigations...`,
      type: 'success'
    });
    setTimeout(() => setToast(null), 3000);

    try {
      setAnalyzingMitigations(true);

      const data = await analyzePostMitigation(attack_paths, mitigationSelections);

      if (data.status === 'ok') {
        setToast({
          message: `Analysis complete! Applied ${mitigationSelections.length} mitigations. Risk reduced by ${data.residual_risk.risk_reduction_percentage.toFixed(1)}%`,
          type: 'success'
        });
        setTimeout(() => setToast(null), 5000);

        // TODO: Handle post-mitigation results display
        console.log('Post-mitigation analysis:', data);
      } else {
        setToast({
          message: 'Failed to analyze mitigations',
          type: 'error'
        });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to analyze all mitigations:', err);
      setToast({
        message: 'Failed to analyze mitigations',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setAnalyzingMitigations(false);
    }
  };

  // Select all mitigations for a specific attack path
  const selectAllMitigations = (path) => {
    const newSelections = {};
    path.steps.forEach(step => {
      // Handle layered mitigations
      if (step.mitigations_by_layer) {
        Object.values(step.mitigations_by_layer).forEach(layerMitigations => {
          if (Array.isArray(layerMitigations)) {
            layerMitigations.forEach(mitigation => {
              const key = `${path.id || path.name}:${step.step_number}:${mitigation.mitigation_id}`;
              newSelections[key] = true;
            });
          }
        });
      }
      // Handle single mitigation (backward compatibility)
      if (step.mitigation) {
        const key = `${path.id || path.name}:${step.step_number}:${step.mitigation.mitigation_id}`;
        newSelections[key] = true;
      }
    });
    setSelectedMitigations(prev => ({ ...prev, ...newSelections }));
  };

  // Copy all mitigations to clipboard
  const copyMitigationsToClipboard = (path) => {
    const mitigationText = path.steps
      .map((step) => {
        const stepMitigations = [];

        // Collect layered mitigations
        if (step.mitigations_by_layer) {
          Object.entries(step.mitigations_by_layer).forEach(([layer, mitigations]) => {
            if (Array.isArray(mitigations)) {
              mitigations.forEach(mitigation => {
                stepMitigations.push({
                  layer,
                  ...mitigation
                });
              });
            }
          });
        }

        // Handle single mitigation (backward compatibility)
        if (step.mitigation && stepMitigations.length === 0) {
          stepMitigations.push(step.mitigation);
        }

        if (stepMitigations.length === 0) return '';

        const mitigationDetails = stepMitigations.map(mit =>
          `  - ${mit.mitigation_id}: ${mit.mitigation_name}${mit.layer ? ` [${mit.layer}]` : ''}\n` +
          `    Description: ${mit.description}\n` +
          (mit.aws_service_action ? `    AWS Action: ${mit.aws_service_action}\n` : '') +
          (mit.priority ? `    Priority: ${mit.priority}\n` : '')
        ).join('\n');

        return `Step ${step.step_number} - ${step.kill_chain_phase}\n` +
               `Technique: ${step.technique_id} - ${step.technique_name}\n` +
               `Mitigations:\n${mitigationDetails}\n`;
      })
      .filter(Boolean)
      .join('---\n\n');

    navigator.clipboard.writeText(mitigationText);
    setToast({
      message: 'Mitigations copied to clipboard!',
      type: 'success'
    });

    // Auto-hide toast after 3 seconds
    setTimeout(() => setToast(null), 3000);
  };

  // Kill chain phase colors (reused from project)
  const getKillChainPhaseColor = (phase) => {
    const colors = {
      'Reconnaissance': { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' },
      'Initial Access': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
      'Execution & Persistence': { bg: '#fed7aa', border: '#f97316', text: '#9a3412' },
      'Lateral Movement & Privilege Escalation': { bg: '#e9d5ff', border: '#a855f7', text: '#6b21a8' },
      'Objective (Exfiltration/Impact)': { bg: '#fecaca', border: '#ef4444', text: '#991b1b' },
      'Covering Tracks': { bg: '#e5e7eb', border: '#6b7280', text: '#1f2937' },
    };
    return colors[phase] || colors['Reconnaissance'];
  };

  const getImpactTypeColor = (impactType) => {
    const colors = {
      confidentiality: { bg: '#dbeafe', text: '#1e40af', label: 'Confidentiality' },
      integrity: { bg: '#fed7aa', text: '#9a3412', label: 'Integrity' },
      availability: { bg: '#fecaca', text: '#991b1b', label: 'Availability' },
    };
    return colors[impactType] || colors.confidentiality;
  };

  const formatTechniqueUrl = (techniqueId) => {
    const formatted = techniqueId.replace('.', '/');
    return `https://attack.mitre.org/techniques/${formatted}/`;
  };

  // Group assets by trust boundary
  const groupAssetsByBoundary = (assetGraph) => {
    const assets = assetGraph.assets || [];
    const boundaries = {};

    assets.forEach(asset => {
      const boundary = asset.trust_boundary || 'unknown';
      if (!boundaries[boundary]) {
        boundaries[boundary] = [];
      }
      boundaries[boundary].push(asset);
    });

    return boundaries;
  };

  // Calculate evaluation statistics
  const calculateEvaluationStats = (paths) => {
    if (!paths || paths.length === 0) return null;

    const stats = {
      feasibility: [],
      impact: [],
      detection: [],
      novelty: [],
      coherence: [],
      composite: []
    };

    paths.forEach(path => {
      const evaluation = path.evaluation || {};
      if (evaluation.feasibility_score) stats.feasibility.push(evaluation.feasibility_score);
      if (evaluation.impact_score) stats.impact.push(evaluation.impact_score);
      if (evaluation.detection_score) stats.detection.push(evaluation.detection_score);
      if (evaluation.novelty_score) stats.novelty.push(evaluation.novelty_score);
      if (evaluation.coherence_score) stats.coherence.push(evaluation.coherence_score);
      const compositeScore = evaluation.composite_score || path.composite_score;
      if (compositeScore) stats.composite.push(compositeScore);
    });

    const average = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const max = (arr) => arr.length > 0 ? Math.max(...arr) : 0;
    const min = (arr) => arr.length > 0 ? Math.min(...arr) : 0;

    return {
      feasibility: { avg: average(stats.feasibility), max: max(stats.feasibility), min: min(stats.feasibility) },
      impact: { avg: average(stats.impact), max: max(stats.impact), min: min(stats.impact) },
      detection: { avg: average(stats.detection), max: max(stats.detection), min: min(stats.detection) },
      novelty: { avg: average(stats.novelty), max: max(stats.novelty), min: min(stats.novelty) },
      coherence: { avg: average(stats.coherence), max: max(stats.coherence), min: min(stats.coherence) },
      composite: { avg: average(stats.composite), max: max(stats.composite), min: min(stats.composite) }
    };
  };

  // Calculate persona stats from activity log
  const getPersonaStats = (personaName) => {
    const deposits = activity_log.filter(
      log => log.deposited_by === personaName && log.action === 'deposit_node'
    ).length;
    const reinforcements = activity_log.filter(
      log => log.deposited_by === personaName &&
      (log.action === 'reinforce_node' || log.action === 'reinforce_edge')
    ).length;
    return { deposits, reinforcements };
  };

  // Section 1: INFRASTRUCTURE ASSET GRAPH
  const renderInfrastructureAssetGraph = () => {
    if (!asset_graph || !asset_graph.assets || asset_graph.assets.length === 0) {
      return null;
    }

    return (
      <div className="stigmergic-section">
        <div className="section-header" onClick={() => toggleSection('assetGraph')}>
          <h3>
            <Shield size={20} />
            Infrastructure Asset Graph
          </h3>
          {expandedSections.assetGraph ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {expandedSections.assetGraph && (
          <div>
            {/* Summary Stats - Always Visible */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                padding: '1.25rem',
                background: '#f8fafc',
                borderRadius: '0.5rem',
                textAlign: 'center',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {asset_graph.assets?.length || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                  Total Assets
                </div>
              </div>
              <div style={{
                padding: '1.25rem',
                background: '#f8fafc',
                borderRadius: '0.5rem',
                textAlign: 'center',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {asset_graph.relationships?.length || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                  Relationships
                </div>
              </div>
              <div style={{
                padding: '1.25rem',
                background: '#f8fafc',
                borderRadius: '0.5rem',
                textAlign: 'center',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {asset_graph.trust_boundaries?.length || 0}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                  Trust Boundaries
                </div>
              </div>
            </div>

            {/* Toggle Button for Details */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button
                onClick={() => setShowAssetDetails(!showAssetDetails)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {showAssetDetails ? (
                  <>
                    <ChevronUp size={16} />
                    Hide Asset Details
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Show Asset Details
                  </>
                )}
              </button>
            </div>

            {/* Detailed Asset Table - Collapsible */}
            {showAssetDetails && (
              <div className="asset-table-container">
                {Object.entries(groupAssetsByBoundary(asset_graph)).map(([boundary, assets]) => (
                  <div key={boundary} className="boundary-group" style={{marginBottom: '1.5rem'}}>
                    <h4 style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: 600,
                      marginBottom: '0.75rem',
                      padding: '0.75rem',
                      background: '#f1f5f9',
                      borderRadius: '0.375rem',
                    }}>
                      <Shield size={16} />
                      {boundary}
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#64748b'
                      }}>({assets.length} assets)</span>
                    </h4>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.875rem'
                    }}>
                      <thead>
                        <tr style={{background: '#f8fafc', borderBottom: '2px solid #e2e8f0'}}>
                          <th style={{padding: '0.75rem', textAlign: 'left', fontWeight: 600}}>Asset Name</th>
                          <th style={{padding: '0.75rem', textAlign: 'left', fontWeight: 600}}>Type</th>
                          <th style={{padding: '0.75rem', textAlign: 'left', fontWeight: 600}}>Service</th>
                          <th style={{padding: '0.75rem', textAlign: 'left', fontWeight: 600}}>Internet Facing</th>
                          <th style={{padding: '0.75rem', textAlign: 'left', fontWeight: 600}}>Trust Boundary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assets.map((asset, idx) => (
                          <tr key={idx} style={{borderBottom: '1px solid #e2e8f0'}}>
                            <td style={{padding: '0.75rem', fontWeight: 500}}>{asset.name}</td>
                            <td style={{padding: '0.75rem', color: '#64748b'}}>{asset.type}</td>
                            <td style={{padding: '0.75rem', color: '#64748b'}}>{asset.service}</td>
                            <td style={{padding: '0.75rem'}}>
                              {asset.properties?.internet_facing ? (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: '#fee2e2',
                                  color: '#991b1b'
                                }}>Yes</span>
                              ) : (
                                <span style={{
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: '#dcfce7',
                                  color: '#166534'
                                }}>No</span>
                              )}
                            </td>
                            <td style={{padding: '0.75rem', color: '#64748b'}}>{asset.trust_boundary || 'unknown'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };


  // Section 3: SWARM EXECUTION TIMELINE
  const renderExecutionTimeline = () => (
    <div className="stigmergic-section">
      <div className="section-header" onClick={() => toggleSection('timeline')}>
        <h3>
          <Users size={20} />
          Swarm Execution Timeline
        </h3>
        {expandedSections.timeline ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {expandedSections.timeline && (
        <div className="timeline-container">
          <div className="timeline-header">
            <span className="timeline-label">Execution Order: <strong>{execution_order}</strong></span>
            <span className="timeline-label">{personas_execution_sequence.length} Agents Executed</span>
          </div>

          <div className="persona-timeline">
            {personas_execution_sequence.map((personaName, index) => {
              const stats = getPersonaStats(personaName);
              const hasReinforcements = stats.reinforcements > 0;

              return (
                <div key={index} className="persona-badge-timeline">
                  <div className="timeline-connector" />
                  <div className={`persona-card ${hasReinforcements ? 'reinforced' : 'diverged'}`}>
                    <div className="persona-order">{index + 1}</div>
                    <div className="persona-name">{personaName}</div>
                    <div className="persona-stats">
                      <span className="stat-item">
                        {stats.deposits} deposits
                      </span>
                      {hasReinforcements && (
                        <span className="stat-item reinforcement">
                          <CheckCircle size={14} />
                          {stats.reinforcements} reinforced
                        </span>
                      )}
                      {!hasReinforcements && (
                        <span className="stat-item divergence">
                          <TrendingUp size={14} />
                          diverged
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Section 4: EMERGENT INSIGHTS PANEL
  const renderEmergentInsights = () => {
    const {
      high_confidence_techniques = [],
      convergent_paths = [],
      coverage_gaps = [],
      technique_clusters = []
    } = emergent_insights;

    return (
      <div className="stigmergic-section">
        <div className="section-header" onClick={() => toggleSection('insights')}>
          <h3>
            <Network size={20} />
            Emergent Insights
          </h3>
          {expandedSections.insights ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {expandedSections.insights && (
          <div className="insights-grid">
            {/* High Confidence Techniques */}
            <div className="insight-card">
              <h4>
                <CheckCircle size={18} />
                High Confidence Techniques
              </h4>
              <p className="insight-description">
                Techniques independently discovered by multiple agents
              </p>
              {high_confidence_techniques.length > 0 ? (
                <div className="technique-list">
                  {high_confidence_techniques.slice(0, 10).map((tech, idx) => (
                    <div key={idx} className="technique-item">
                      <a
                        href={formatTechniqueUrl(tech.technique_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="technique-badge-link"
                      >
                        {tech.technique_id}
                      </a>
                      <span className="technique-name">{tech.technique_name}</span>
                      <span className="technique-reinforcement">
                        {tech.times_reinforced + 1} agents
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No reinforced techniques found</p>
              )}
            </div>

            {/* Convergent Paths */}
            <div className="insight-card">
              <h4>
                <TrendingUp size={18} />
                Convergent Paths
              </h4>
              <p className="insight-description">
                Attack sequences discovered by multiple personas
              </p>
              {convergent_paths.length > 0 ? (
                <div className="convergent-paths-list">
                  {convergent_paths.slice(0, 5).map((path, idx) => (
                    <div key={idx} className="convergent-path-item">
                      <div className="path-sequence">
                        {path.technique_sequence.map((tech, techIdx) => (
                          <span key={techIdx}>
                            <code className="technique-code">{tech}</code>
                            {techIdx < path.technique_sequence.length - 1 && ' → '}
                          </span>
                        ))}
                      </div>
                      <span className="convergence-badge">
                        {path.path_length} steps, Avg pheromone: {path.avg_pheromone.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No convergent paths detected</p>
              )}
            </div>

            {/* Coverage Gaps */}
            <div className="insight-card">
              <h4>
                <AlertCircle size={18} />
                Coverage Gaps
              </h4>
              <p className="insight-description">
                Assets not explored by any agent
              </p>
              {coverage_gaps.length > 0 ? (
                <div className="gap-list">
                  {coverage_gaps.slice(0, 10).map((asset, idx) => (
                    <div key={idx} className="gap-item">
                      <code>{asset}</code>
                    </div>
                  ))}
                  {coverage_gaps.length > 10 && (
                    <p className="more-items">+ {coverage_gaps.length - 10} more assets</p>
                  )}
                </div>
              ) : (
                <p className="empty-state">Full coverage achieved</p>
              )}
            </div>

            {/* Technique Clusters */}
            <div className="insight-card">
              <h4>
                <Network size={18} />
                Technique Clusters
              </h4>
              <p className="insight-description">
                Frequently co-occurring technique pairs
              </p>
              {technique_clusters.length > 0 ? (
                <div className="cluster-list">
                  {technique_clusters.slice(0, 8).map((cluster, idx) => (
                    <div key={idx} className="cluster-item">
                      <div className="cluster-techniques">
                        <code>{cluster.techniques[0]}</code>
                        <span className="cluster-arrow">⇄</span>
                        <code>{cluster.techniques[1]}</code>
                      </div>
                      <span className="cluster-count">
                        {cluster.co_occurrence_count}× co-occurrence
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No clusters detected</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Section 5: SHARED GRAPH VISUALIZATION
  const renderSharedGraph = () => {
    if (!shared_graph_snapshot || !shared_graph_snapshot.nodes || shared_graph_snapshot.nodes.length === 0) {
      return null;
    }

    return (
      <div className="stigmergic-section">
        <div className="section-header" onClick={() => toggleSection('graph')}>
          <h3>
            <Network size={20} />
            Shared Attack Graph
          </h3>
          {expandedSections.graph ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {expandedSections.graph && (
          <div style={{
            width: '100%',
            minHeight: 600,
            position: 'relative',
            padding: 0,
            margin: 0,
            boxSizing: 'border-box',
          }}>
            <SharedAttackGraph
              data={shared_graph_snapshot}
              coverageGaps={emergent_insights?.coverage_gaps || []}
              convergentPaths={emergent_insights?.convergent_paths || []}
            />
          </div>
        )}
      </div>
    );
  };

  // Section 6: ATTACK PATHS (with swarm indicators and defence-in-depth mitigations)
  const renderAttackPaths = () => {
    if (attack_paths.length === 0) {
      return null;
    }

    return (
      <div className="stigmergic-section">
        <div className="section-header" onClick={() => toggleSection('paths')}>
          <h3>
            Attack Paths ({attack_paths.length})
          </h3>
          {expandedSections.paths ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {expandedSections.paths && (
          <div className="paths-container">
            {/* Separate confirmed vuln paths from agent exploration paths */}
            {(() => {
              const paths = results.csa_risk_assessment?.scored_paths || attack_paths || []

              // Separate paths by source
              const confirmedVulnPaths = paths.filter(p => p.source === 'confirmed_vuln_synthesis')
              const agentExplorationPaths = paths.filter(p => p.source !== 'confirmed_vuln_synthesis')

              // Sort confirmed vuln paths by risk level
              const sortedConfirmed = [...confirmedVulnPaths].sort((a, b) => {
                const scoreA = a.csa_risk_score?.risk_level ?? 0
                const scoreB = b.csa_risk_score?.risk_level ?? 0
                return scoreB - scoreA
              })

              // Sort agent exploration paths by risk level
              const sortedAgent = [...agentExplorationPaths].sort((a, b) => {
                const scoreA = a.csa_risk_score?.risk_level ?? 0
                const scoreB = b.csa_risk_score?.risk_level ?? 0
                return scoreB - scoreA
              })

              return (
                <>
                  {/* Confirmed Vulnerability-Grounded Paths */}
                  {sortedConfirmed.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{
                        fontSize: 16,
                        fontWeight: 600,
                        marginBottom: 12,
                        color: 'var(--color-text-primary)'
                      }}>
                        Confirmed Vulnerability-Grounded Paths ({sortedConfirmed.length})
                      </h4>
                      {sortedConfirmed.map((path, i) => (
                        <CsaPathCard
                          key={path.path_id || path.id || `confirmed-${i}`}
                          path={path}
                          defaultExpanded={false}
                          selectedMitigations={selectedMitigations}
                          toggleMitigationSelection={toggleMitigationSelection}
                        />
                      ))}
                    </div>
                  )}

                  {/* Agent Explorations - Collapsed by Default */}
                  {sortedAgent.length > 0 && (
                    <AgentExplorationsSection
                      paths={sortedAgent}
                      selectedMitigations={selectedMitigations}
                      toggleMitigationSelection={toggleMitigationSelection}
                    />
                  )}
                </>
              )
            })()}
          </div>
        )}
      </div>
    );
  };

  // Helper function to get confidence badge styling
  const getConfidenceBadge = (confidence) => {
    const badges = {
      high: { color: '#10b981', bg: '#d1fae5', label: 'HIGH' },
      medium: { color: '#f59e0b', bg: '#fef3c7', label: 'MEDIUM' },
      low: { color: '#ef4444', bg: '#fee2e2', label: 'LOW' }
    };
    return badges[confidence] || badges.medium;
  };

  // Generate executive summary
  const generateExecutiveSummary = () => {
    if (attack_paths.length === 0) return null;

    const highScorePaths = attack_paths.filter(p => {
      const score = p.evaluation?.composite_score || p.composite_score || 0;
      return score >= 7;
    }).length;

    const coverage = emergent_insights?.summary?.coverage_percentage || 0;
    const reinforcedTechniques = emergent_insights?.high_confidence_techniques?.length || 0;

    return `Stigmergic swarm analysis completed with ${personas_execution_sequence.length} threat actor personas executing in ${execution_order} order. Discovered ${attack_paths.length} attack paths with ${reinforcedTechniques} high-confidence techniques validated by multiple agents. Infrastructure coverage: ${coverage.toFixed(1)}%. ${highScorePaths > 0 ? `${highScorePaths} high-risk paths (score ≥7.0) require immediate attention.` : 'Risk levels vary across the attack surface.'}`;
  };

  return (
    <div className="stigmergic-results-view">
      <div className="stigmergic-header">
        <h2>🧪 Multi-agents Swarm Exploration Results</h2>
        <p className="stigmergic-subtitle">
          Agents built on each other's discoveries through shared graph coordination
        </p>
      </div>

      {/* Executive Summary */}
      {(() => {
        const summary = generateExecutiveSummary();
        if (!summary) return null;

        return (
          <div className="executive-summary">
            <h3>Executive Summary</h3>
            <p>{summary}</p>
          </div>
        );
      })()}

      {/* Stats Bar */}
      <div className="results-stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total Paths</span>
          <span className="stat-value">{attack_paths.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Execution Time</span>
          <span className="stat-value">
            {results.execution_time_seconds
              ? `${Math.round(results.execution_time_seconds / 60)}m`
              : 'N/A'}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Coverage</span>
          <span className="stat-value">
            {emergent_insights?.summary?.coverage_percentage
              ? `${emergent_insights.summary.coverage_percentage.toFixed(1)}%`
              : 'N/A'}
          </span>
        </div>
      </div>

      {renderInfrastructureAssetGraph()}

      {/* CSA Risk Assessment Summary */}
      {results.csa_risk_assessment && (
        <div className="stigmergic-section">
          <CsaRiskSummary
            csaRiskAssessment={results.csa_risk_assessment}
          />
        </div>
      )}

      {renderExecutionTimeline()}
      {renderEmergentInsights()}
      {renderSharedGraph()}
      {renderAttackPaths()}

      {/* Comprehensive Mitigation Summary */}
      {attack_paths.length > 0 && (
        <div className="stigmergic-section">
          <MitigationSummary
            paths={results.csa_risk_assessment?.scored_paths || attack_paths}
            title="Comprehensive Mitigation Summary - All Attack Paths"
            selectedMitigations={selectedMitigations}
            clearAllMitigations={clearAllMitigations}
            applyAllMitigations={applyAllMitigations}
            analyzingMitigations={analyzingMitigations}
          />
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '1.5rem',
          right: '1.5rem',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <CheckCircle size={20} />
          <span style={{fontWeight: 600}}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

// Agent Explorations Collapsible Section Component
function AgentExplorationsSection({ paths, selectedMitigations, toggleMitigationSelection }) {
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
            These attack paths were discovered by threat actor persona agents during exploration.
            They represent creative attack scenarios based on infrastructure analysis and agent expertise.
          </p>
          {paths.map((path, i) => (
            <CsaPathCard
              key={path.path_id || path.id || `agent-${i}`}
              path={path}
              defaultExpanded={false}
              selectedMitigations={selectedMitigations}
              toggleMitigationSelection={toggleMitigationSelection}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default StigmergicResultsView;
