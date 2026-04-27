import { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Play, Zap, ChevronDown, ChevronUp, Shield, AlertTriangle, CheckCircle, User, Check, X, TrendingDown, Archive, Edit2, Trash2, Save, StopCircle, Settings, Network, Home, FileUp, BarChart3, Layers, Target, XOctagon } from 'lucide-react';
import Toast from '../components/Toast';
import StigmergicResultsView from '../components/StigmergicResultsView';
import ImpactSelector from '../components/ImpactSelector';
import ThreatModelSummary from '../components/ThreatModelSummary';
import CsaRiskSummary from '../components/CsaRiskSummary';
import ResidualRiskSummary from '../components/ResidualRiskSummary';
import CsaPathCard from '../components/CsaPathCard';
import MitigationSummary from '../components/MitigationSummary';
import { uploadAndRunSwarm, uploadAndRunQuick, uploadAndRunSingleAgent, uploadAndRunStigmergic, getPersonas, analyzePostMitigation, getArchivedRuns, getArchivedRun, updateRunName, deleteArchivedRun, getAvailableModels, checkHealth, cancelRun } from '../api/client';
import { formatGMT8DateShort, formatGMT8Time } from '../utils/formatters';
import './ThreatModelPage.css';

function ThreatModelPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [personas, setPersonas] = useState({});
  const [selectedAgent, setSelectedAgent] = useState('apt29_cozy_bear');
  const [executionOrder, setExecutionOrder] = useState('capability_ascending'); // For stigmergic swarm
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [heartbeat, setHeartbeat] = useState(0);
  const [backendAlive, setBackendAlive] = useState(true);
  const [lastBackendCheck, setLastBackendCheck] = useState(null);

  // LLM model selection state
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(''); // Default to "Use default from .env"

  // CSA CII impact score state
  const [impactScore, setImpactScore] = useState(3); // Default: Moderate

  // Post-mitigation analysis state
  const [selectedMitigations, setSelectedMitigations] = useState({});
  const [postMitigationAnalysis, setPostMitigationAnalysis] = useState(null);
  const [analyzingMitigations, setAnalyzingMitigations] = useState(false);
  const [viewMode, setViewMode] = useState('pre'); // 'pre', 'post', 'comparison'

  // Archived runs state
  const [archivedRuns, setArchivedRuns] = useState([]);
  const [editingRunId, setEditingRunId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('main');

  // Cancel token for aborting requests
  const [cancelTokenSource, setCancelTokenSource] = useState(null);

  // Helper function to format execution time
  const formatExecutionTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  // Helper function to format elapsed time as MM:SS
  const formatElapsedTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper function to get contextual status message based on elapsed time
  const getContextualStatusMessage = (seconds) => {
    if (seconds < 60) {
      return 'Initializing threat modeling pipeline...';
    } else if (seconds < 180) {
      return 'Parsing infrastructure and building asset graph...';
    } else if (seconds < 600) {
      return 'Exploration agents analyzing attack vectors...';
    } else if (seconds < 900) {
      return 'Evaluation crew scoring attack paths...';
    } else if (seconds < 1200) {
      return 'Adversarial validation in progress...';
    } else if (seconds < 1800) {
      return 'Final arbitration and mitigation mapping...';
    } else {
      return 'Long-running operation, almost there...';
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validExtensions = ['.tf', '.yaml', '.yml', '.json'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (validExtensions.includes(fileExtension)) {
        setSelectedFile(file);
        setError(null);
        setResult(null);
      } else {
        setError('Invalid file type. Please select a .tf, .yaml, .yml, or .json file.');
        setSelectedFile(null);
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const validExtensions = ['.tf', '.yaml', '.yml', '.json'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (validExtensions.includes(fileExtension)) {
        setSelectedFile(file);
        setError(null);
        setResult(null);
      } else {
        setError('Invalid file type. Please select a .tf, .yaml, .yml, or .json file.');
      }
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Fetch available personas and models on mount
  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const data = await getPersonas();
        setPersonas(data);
      } catch (err) {
        console.error('Failed to fetch personas:', err);
      }
    };

    const fetchModels = async () => {
      try {
        const data = await getAvailableModels();
        setAvailableModels(data.models || []);
        // Set default to current model if not selected
        if (!selectedModel && data.current_model) {
          // Don't set it - leave as null to use .env default
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };

    fetchPersonas();
    fetchModels();
  }, []);

  // Heartbeat effect to show test is alive and poll backend health
  useEffect(() => {
    let heartbeatInterval;
    let backendCheckInterval;

    if (running) {
      // Update heartbeat counter every second
      heartbeatInterval = setInterval(() => {
        setHeartbeat(prev => prev + 1);
      }, 1000);

      // Check backend health every 10 seconds
      backendCheckInterval = setInterval(async () => {
        try {
          await checkHealth();
          setBackendAlive(true);
          setLastBackendCheck(new Date());
        } catch (err) {
          console.error('Backend health check failed:', err);
          setBackendAlive(false);
        }
      }, 10000);

      // Initial backend check
      checkHealth()
        .then(() => {
          setBackendAlive(true);
          setLastBackendCheck(new Date());
        })
        .catch(() => setBackendAlive(false));
    } else {
      setHeartbeat(0);
      setBackendAlive(true);
      setLastBackendCheck(null);
    }

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(backendCheckInterval);
    };
  }, [running]);

  // Load archived runs on mount and after successful pipeline runs
  useEffect(() => {
    loadArchivedRuns();
  }, []);

  // Reload archived runs when result changes (new run completed)
  useEffect(() => {
    if (result && result.status === 'ok') {
      loadArchivedRuns();
    }
  }, [result]);

  const loadArchivedRuns = async () => {
    try {
      const data = await getArchivedRuns();
      setArchivedRuns(data.runs || []);
    } catch (err) {
      console.error('Failed to load archived runs:', err);
    }
  };

  const handleLoadArchivedRun = async (runId) => {
    try {
      const data = await getArchivedRun(runId);

      // Normalize stigmergic archived runs to match expected result structure
      let resultData = data.result;
      if (resultData.run_type === 'multi_agents_swarm') {
        resultData = {
          ...resultData,
          final_paths: resultData.attack_paths || [],
          executive_summary: `Stigmergic swarm exploration completed with ${resultData.personas_used?.length || 0} agents. ` +
            `Discovered ${resultData.attack_paths?.length || 0} attack paths with ` +
            `${resultData.shared_graph_snapshot?.statistics?.reinforced_nodes || 0} reinforced techniques ` +
            `(high-confidence paths validated by multiple agents). ` +
            `Execution order: ${resultData.execution_order}.`,
          adversarial_summary: {
            coverage_estimate: resultData.emergent_insights?.summary?.coverage_percentage
              ? `${resultData.emergent_insights.summary.coverage_percentage.toFixed(1)}%`
              : 'N/A'
          }
        };
      }

      setResult(resultData);
      setSelectedMitigations({});
      setPostMitigationAnalysis(null);
      setViewMode('pre');
      setToast({
        message: `Loaded archived run: ${data.metadata.name}`,
        type: 'success',
      });
    } catch (err) {
      setToast({
        message: `Failed to load run: ${err.message}`,
        type: 'error',
      });
    }
  };

  const handleStartEditRunName = (runId, currentName) => {
    setEditingRunId(runId);
    setEditingName(currentName);
  };

  const handleSaveRunName = async (runId) => {
    try {
      await updateRunName(runId, editingName);
      setEditingRunId(null);
      setEditingName('');
      loadArchivedRuns();
      setToast({
        message: 'Run name updated successfully',
        type: 'success',
      });
    } catch (err) {
      setToast({
        message: `Failed to update name: ${err.message}`,
        type: 'error',
      });
    }
  };

  const handleCancelEditRunName = () => {
    setEditingRunId(null);
    setEditingName('');
  };

  const handleDeleteRun = async (runId, runName) => {
    if (!window.confirm(`Are you sure you want to delete "${runName}"?`)) {
      return;
    }

    try {
      await deleteArchivedRun(runId);
      loadArchivedRuns();
      setToast({
        message: 'Run deleted successfully',
        type: 'success',
      });
    } catch (err) {
      setToast({
        message: `Failed to delete run: ${err.message}`,
        type: 'error',
      });
    }
  };

  const runSwarm = async (mode = 'full') => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    if (mode === 'single' && !selectedAgent) {
      setError('Please select an agent first');
      return;
    }

    // Validate that selected model is not WIP
    if (selectedModel) {
      const modelInfo = availableModels.find(m => m.name === selectedModel);
      if (modelInfo && modelInfo.is_wip) {
        setError('Selected model is marked as Work In Progress and cannot be used. Please select the default model or another enabled model.');
        setToast({
          message: 'Cannot use Work In Progress model',
          type: 'error'
        });
        return;
      }
    }

    try {
      setRunning(true);
      setError(null);
      setResult(null);

      // Create cancel token for this request
      const source = axios.CancelToken.source();
      setCancelTokenSource(source);

      // Simulate phase updates (since the API is synchronous)
      const phases = [
        'Parsing IaC file...',
        'Running Exploration Swarm...',
        'Evaluating Paths...',
        'Adversarial Validation...',
        'Mapping Mitigations...'
      ];

      let phaseIndex = 0;
      const phaseInterval = setInterval(() => {
        if (phaseIndex < phases.length) {
          setCurrentPhase(phases[phaseIndex]);
          phaseIndex++;
        }
      }, mode === 'quick' || mode === 'single' ? 2000 : 4000);

      let data;
      if (mode === 'quick') {
        data = await uploadAndRunQuick(selectedFile, selectedModel, impactScore, source.token);
      } else if (mode === 'single') {
        data = await uploadAndRunSingleAgent(selectedFile, selectedAgent, selectedModel, impactScore, source.token);
      } else if (mode === 'stigmergic') {
        data = await uploadAndRunStigmergic(selectedFile, executionOrder, selectedModel, impactScore, source.token);
      } else {
        data = await uploadAndRunSwarm(selectedFile, selectedModel, impactScore, source.token);
      }

      clearInterval(phaseInterval);

      if (data.status === 'ok') {
        // Normalize stigmergic response to match expected result structure
        if (mode === 'stigmergic') {
          const normalizedData = {
            ...data,
            final_paths: data.attack_paths || [],
            executive_summary: `Stigmergic swarm exploration completed with ${data.personas_used?.length || 0} agents. ` +
              `Discovered ${data.attack_paths?.length || 0} attack paths with ` +
              `${data.shared_graph_snapshot?.statistics?.reinforced_nodes || 0} reinforced techniques ` +
              `(high-confidence paths validated by multiple agents). ` +
              `Execution order: ${data.execution_order}.`,
            adversarial_summary: {
              coverage_estimate: data.emergent_insights?.summary?.coverage_percentage
                ? `${data.emergent_insights.summary.coverage_percentage.toFixed(1)}%`
                : 'N/A'
            }
          };
          setResult(normalizedData);
        } else {
          setResult(data);
        }

        let message;
        if (mode === 'stigmergic') {
          const pathCount = data.attack_paths?.length || 0;
          const reinforcedCount = data.shared_graph_snapshot?.statistics?.reinforced_nodes || 0;
          message = `Stigmergic swarm complete! Found ${pathCount} attack paths with ${reinforcedCount} reinforced techniques.`;
        } else {
          const agentInfo = mode === 'single' ? ` using ${personas[selectedAgent]?.display_name || selectedAgent}` : '';
          const pathCount = data.final_paths?.length || data.attack_paths?.length || 0;
          message = `Threat model complete${agentInfo}! Found ${pathCount} attack paths.`;
        }
        setToast({
          message: message,
          type: 'success'
        });
      } else {
        setError(data.error || 'Failed to run threat model');
      }
    } catch (err) {
      // Check if error was due to cancellation
      if (axios.isCancel(err)) {
        console.log('Request cancelled:', err.message);
        // Don't show error toast for user-initiated cancellations
        return;
      }

      console.error('Failed to run swarm:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to run threat model');
      setToast({
        message: 'Failed to run threat model',
        type: 'error'
      });
    } finally {
      setRunning(false);
      setCurrentPhase('');
      setCancelTokenSource(null);
    }
  };

  const handleCancelRun = async () => {
    try {
      // Cancel the ongoing HTTP request
      if (cancelTokenSource) {
        cancelTokenSource.cancel('User cancelled the operation');
      }

      // Reset UI state
      setRunning(false);
      setCurrentPhase('');
      setCurrentJobId(null);
      setCancelTokenSource(null);

      setToast({
        message: 'Threat modeling operation cancelled',
        type: 'info'
      });
    } catch (err) {
      console.error('Failed to cancel run:', err);
      setToast({
        message: 'Error cancelling operation',
        type: 'error'
      });
    }
  };

  const togglePathExpanded = (index) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPaths(newExpanded);
  };

  const getConfidenceBadge = (confidence) => {
    const badges = {
      high: { color: '#10b981', bg: '#d1fae5', label: 'HIGH' },
      medium: { color: '#f59e0b', bg: '#fef3c7', label: 'MEDIUM' },
      low: { color: '#ef4444', bg: '#fee2e2', label: 'LOW' }
    };
    return badges[confidence] || badges.medium;
  };

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
    // Convert T1566.001 to T1566/001 for MITRE ATT&CK URL
    const formatted = techniqueId.replace('.', '/');
    return `https://attack.mitre.org/techniques/${formatted}/`;
  };

  const copyMitigationsToClipboard = (steps) => {
    const mitigationText = steps
      .map((step, idx) => {
        const mitigation = step.mitigation;
        if (!mitigation) return '';
        return `Step ${idx + 1} - ${step.kill_chain_phase}\n` +
               `Technique: ${step.technique_id} - ${step.technique_name}\n` +
               `Mitigation: ${mitigation.mitigation_name}\n` +
               `Description: ${mitigation.description}\n` +
               `AWS Action: ${mitigation.aws_service_action}\n\n`;
      })
      .filter(Boolean)
      .join('---\n\n');

    navigator.clipboard.writeText(mitigationText);
    setToast({
      message: 'Mitigations copied to clipboard!',
      type: 'success'
    });
  };

  // Handle mitigation checkbox toggle
  const toggleMitigationSelection = (pathId, stepNumber, mitigationId) => {
    const key = `${pathId}:${stepNumber}:${mitigationId}`;
    setSelectedMitigations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Select all mitigations for a path
  const selectAllMitigations = (path) => {
    const newSelections = {};
    path.steps.forEach(step => {
      if (step.mitigation) {
        const key = `${path.id}:${step.step_number}:${step.mitigation.mitigation_id}`;
        newSelections[key] = true;
      }
    });
    setSelectedMitigations(prev => ({ ...prev, ...newSelections }));
  };

  // Clear all mitigation selections
  const clearAllMitigations = () => {
    setSelectedMitigations({});
    setPostMitigationAnalysis(null);
    setViewMode('pre');
  };
  // Helper: Calculate residual risk distribution from post-mitigation paths
  const calculateResidualRiskDistribution = (postMitigationPaths) => {
    const distribution = {
      'Very High': 0,
      'High': 0,
      'Medium-High': 0,
      'Medium': 0,
      'Low': 0,
    }

    let highestBand = 'Low'
    const bandPriority = { 'Very High': 5, 'High': 4, 'Medium-High': 3, 'Medium': 2, 'Low': 1 }

    postMitigationPaths.forEach(path => {
      // Use residual CSA risk score directly from backend (already calculated correctly)
      const riskBand = path.residual_csa_risk_score?.risk_band || 'Low'
      distribution[riskBand] += 1

      if (bandPriority[riskBand] > bandPriority[highestBand]) {
        highestBand = riskBand
      }
    })

    return { distribution, highestBand }
  }

  // Apply selected mitigations and run post-mitigation analysis
  const applyMitigations = async () => {
    if (!result || !result.final_paths) {
      setToast({
        message: 'No attack paths to analyze',
        type: 'error'
      });
      return;
    }

    // Convert selectedMitigations object to array format expected by API
    const mitigationSelections = Object.entries(selectedMitigations)
      .filter(([_, selected]) => selected)
      .map(([key, _]) => {
        const [pathId, stepNumber, mitigationId] = key.split(':');
        return {
          path_id: pathId,
          step_number: parseInt(stepNumber),
          mitigation_id: mitigationId,
          selected: true
        };
      });

    if (mitigationSelections.length === 0) {
      setToast({
        message: 'Please select at least one mitigation to apply',
        type: 'warning'
      });
      return;
    }

    try {
      setAnalyzingMitigations(true);
      setError(null);

      const data = await analyzePostMitigation(result.final_paths, mitigationSelections);

      if (data.status === 'ok') {
        // Enrich post-mitigation paths by merging with original path data
        const enrichedPaths = data.post_mitigation_paths.map(pmPath => {
          // Find original path to merge data
          const originalPath = (result.csa_risk_assessment?.scored_paths || result.final_paths || [])
            .find(p => (p.path_id || p.id || p.name) === pmPath.path_id)

          return {
            ...originalPath,
            ...pmPath,
            // Use CSA residual risk score directly from backend (already calculated correctly)
            residual_csa_risk_score: pmPath.residual_csa_risk_score || null
          }
        })

        // Calculate residual risk distribution from backend's CSA scores
        const { distribution, highestBand } = calculateResidualRiskDistribution(enrichedPaths)

        // Create enriched analysis object
        const enrichedAnalysis = {
          ...data,
          post_mitigation_paths: enrichedPaths,
          residual_risk_assessment: {
            risk_distribution: distribution,
            highest_band: highestBand,
            paths_scored: enrichedPaths.length,
            risk_reduction_percentage: data.residual_risk.risk_reduction_percentage,
            framework: 'CSA Cloud Controls Matrix (CCM) v4 & CII Risk Assessment Guide Feb 2021'
          }
        }

        setPostMitigationAnalysis(enrichedAnalysis);
        setViewMode('post');
        setToast({
          message: `Analysis complete! Risk reduced by ${data.residual_risk.risk_reduction_percentage.toFixed(1)}%`,
          type: 'success'
        });
      } else {
        setError(data.error || 'Failed to analyze mitigations');
        setToast({
          message: 'Failed to analyze mitigations',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Failed to analyze mitigations:', err);
      setError(err.message || 'Failed to analyze mitigations');
      setToast({
        message: 'Failed to analyze mitigations',
        type: 'error'
      });
    } finally {
      setAnalyzingMitigations(false);
    }
  };

  // Apply ALL mitigations and run post-mitigation analysis
  const applyAllMitigations = async () => {
    if (!result || !result.final_paths) {
      setToast({
        message: 'No attack paths to analyze',
        type: 'error'
      });
      return;
    }

    // Get all paths
    const paths = result.csa_risk_assessment?.scored_paths || result.final_paths || [];

    // Build selectedMitigations object with ALL mitigations selected
    const allMitigations = {};
    const mitigationSelections = [];

    paths.forEach(path => {
      const pathId = path.path_id || path.id || path.name;
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
        type: 'warning'
      });
      return;
    }

    // Show count to user
    setToast({
      message: `Applying all ${mitigationSelections.length} mitigations...`,
      type: 'success'
    });

    try {
      setAnalyzingMitigations(true);
      setError(null);

      const data = await analyzePostMitigation(result.final_paths, mitigationSelections);

      if (data.status === 'ok') {
        // Enrich post-mitigation paths by merging with original path data
        const enrichedPaths = data.post_mitigation_paths.map(pmPath => {
          // Find original path to merge data
          const originalPath = (result.csa_risk_assessment?.scored_paths || result.final_paths || [])
            .find(p => (p.path_id || p.id || p.name) === pmPath.path_id)

          return {
            ...originalPath,
            ...pmPath,
            // Use CSA residual risk score directly from backend (already calculated correctly)
            residual_csa_risk_score: pmPath.residual_csa_risk_score || null
          }
        })

        // Calculate residual risk distribution from backend's CSA scores
        const { distribution, highestBand } = calculateResidualRiskDistribution(enrichedPaths)

        // Create enriched analysis object
        const enrichedAnalysis = {
          ...data,
          post_mitigation_paths: enrichedPaths,
          residual_risk_assessment: {
            risk_distribution: distribution,
            highest_band: highestBand,
            paths_scored: enrichedPaths.length,
            risk_reduction_percentage: data.residual_risk.risk_reduction_percentage,
            framework: 'CSA Cloud Controls Matrix (CCM) v4 & CII Risk Assessment Guide Feb 2021'
          }
        }

        setPostMitigationAnalysis(enrichedAnalysis);
        setViewMode('post');
        setToast({
          message: `Analysis complete! Applied ${mitigationSelections.length} mitigations. Risk reduced by ${data.residual_risk.risk_reduction_percentage.toFixed(1)}%`,
          type: 'success'
        });
      } else {
        setError(data.error || 'Failed to analyze mitigations');
        setToast({
          message: 'Failed to analyze mitigations',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Failed to analyze all mitigations:', err);
      setError(err.message || 'Failed to analyze mitigations');
      setToast({
        message: 'Failed to analyze mitigations',
        type: 'error'
      });
    } finally {
      setAnalyzingMitigations(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

  // Calculate evaluation statistics across all paths
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

  return (
    <div className="threat-model-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h2>Threat Modeling</h2>
          <p className="page-subtitle">
            Multi-agent swarm analysis of infrastructure attack paths
          </p>
        </div>
      </div>

      <div className="page-content-with-sidebar">
        {/* Sidebar: Archived Runs */}
        <div className="archived-runs-sidebar">
          <div className="sidebar-header">
            <Archive size={20} />
            <h3>Archived Runs</h3>
          </div>

          <div className="archived-runs-list">
            {archivedRuns.length === 0 ? (
              <div className="no-runs-message">
                <p>No archived runs yet</p>
                <p className="hint">Complete a threat model to create your first archive</p>
              </div>
            ) : (
              archivedRuns.map((run) => (
                <div key={run.run_id} className="archived-run-item">
                  {editingRunId === run.run_id ? (
                    <div className="editing-run-name">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="edit-name-input"
                        autoFocus
                      />
                      <div className="edit-actions">
                        <button
                          onClick={() => handleSaveRunName(run.run_id)}
                          className="btn-icon btn-save"
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={handleCancelEditRunName}
                          className="btn-icon btn-cancel"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="run-info"
                        onClick={() => handleLoadArchivedRun(run.run_id)}
                      >
                        {/* Model Used */}
                        <div className="run-header">
                          {run.model_used ? (
                            <span className="model-badge-main">{run.model_used}</span>
                          ) : (
                            <span className="model-badge-main unknown">Model Unknown</span>
                          )}
                          <span className="run-mode-badge">{run.mode}</span>
                        </div>

                        {/* System Time of Run (GMT+8) */}
                        <div className="run-timestamp">
                          <span className="timestamp-icon">🕐</span>
                          <span className="timestamp-text">
                            {formatGMT8DateShort(run.created_at)} at {formatGMT8Time(run.created_at)} GMT+8
                          </span>
                        </div>

                        {/* File Used */}
                        <div className="run-file-info">
                          <span className="file-icon">📄</span>
                          <span className="file-name">{run.file_name}</span>
                        </div>

                        {/* Attack Paths Count */}
                        <div className="run-paths-info">
                          <span className="paths-icon">🎯</span>
                          <span className="paths-text">
                            <strong>{run.paths_count}</strong> attack path{run.paths_count !== 1 ? 's' : ''} identified
                          </span>
                        </div>

                        {/* Execution Time */}
                        <div className="run-duration-info">
                          <span className="duration-icon">⏱️</span>
                          <span className="duration-text">
                            Completed in <strong>{formatExecutionTime(run.execution_time_seconds)}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="run-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditRunName(run.run_id, run.name);
                          }}
                          className="btn-icon"
                          title="Edit name"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRun(run.run_id, run.name);
                          }}
                          className="btn-icon btn-delete"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="main-content">

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'main' ? 'active' : ''}`}
              onClick={() => setActiveTab('main')}
            >
              <Home size={16} />
              <span>Main</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'run-test' ? 'active' : ''}`}
              onClick={() => setActiveTab('run-test')}
              disabled={!result}
            >
              <FileUp size={16} />
              <span>Run Test</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
              disabled={!result}
            >
              <BarChart3 size={16} />
              <span>Summary</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'architecture' ? 'active' : ''}`}
              onClick={() => setActiveTab('architecture')}
              disabled={!result}
            >
              <Layers size={16} />
              <span>Architecture</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'risk-assessment' ? 'active' : ''}`}
              onClick={() => setActiveTab('risk-assessment')}
              disabled={!result}
            >
              <AlertTriangle size={16} />
              <span>Risk Assessment</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'attack-paths' ? 'active' : ''}`}
              onClick={() => setActiveTab('attack-paths')}
              disabled={!result}
            >
              <Target size={16} />
              <span>Attack Paths</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'mitigations' ? 'active' : ''}`}
              onClick={() => setActiveTab('mitigations')}
              disabled={!result}
            >
              <Shield size={16} />
              <span>Mitigations</span>
            </button>
            <button
              className={`tab-button ${activeTab === 'post-mitigation' ? 'active' : ''}`}
              onClick={() => setActiveTab('post-mitigation')}
              disabled={!postMitigationAnalysis}
            >
              <TrendingDown size={16} />
              <span className="tab-text-multiline">Post-Mitigation<br/>Risk Assessment</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">

      {/* Landing State - Show when no results yet */}
      {!result && !running && (
        <div className="landing-state">
          <div className="landing-card">
            <Upload size={48} className="landing-icon" />
            <h3>Welcome to Swarm Threat Modeling</h3>
            <p className="landing-description">
              Upload your Infrastructure-as-Code file to begin AI-powered threat analysis.
              Our multi-agent system will explore, evaluate, and validate attack paths against your infrastructure.
            </p>

            <div className="landing-steps">
              <div className="landing-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>Upload IaC File</h4>
                  <p>Upload a Terraform (.tf) or CloudFormation (.yaml/.json) file describing your AWS infrastructure</p>
                </div>
              </div>

              <div className="landing-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>Choose Analysis Mode</h4>
                  <p>Multi-agents Run (all agents, ~10min) for comprehensive analysis, 2 agents test (~5min) for rapid testing, or single agent run (1 agent, ~3-5min) for focused analysis</p>
                </div>
              </div>

              <div className="landing-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>Review Results</h4>
                  <p>Explore validated attack paths with scores, MITRE ATT&CK mappings, and actionable mitigations</p>
                </div>
              </div>
            </div>

            <div className="landing-requirements">
              <h4>Requirements:</h4>
              <ul>
                <li>File must be &lt; 1MB</li>
                <li>Supported formats: .tf, .yaml, .yml, .json</li>
                <li>LLM provider must be configured (check backend status)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Section A: Upload Panel */}
      {(activeTab === 'main' || activeTab === 'run-test') && (
      <div className="upload-panel">
        <h3>Upload Infrastructure-as-Code</h3>

        {/* CSA CII Impact Score Selection */}
        <ImpactSelector
          value={impactScore}
          onChange={setImpactScore}
        />

        <div
          className={`file-dropzone ${selectedFile ? 'has-file' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {!selectedFile ? (
            <>
              <Upload size={48} className="dropzone-icon" />
              <p className="dropzone-text">Drop your IaC file here or click to browse</p>
              <p className="dropzone-hint">Supports .tf, .yaml, .yml, .json files</p>
              <input
                type="file"
                accept=".tf,.yaml,.yml,.json"
                onChange={handleFileSelect}
                className="file-input"
              />
            </>
          ) : (
            <div className="selected-file-info">
              <CheckCircle size={32} className="file-check-icon" />
              <div className="file-details">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedFile(null)}
                disabled={running}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Agent Selection for single agent run */}
        <div className="agent-selection">
          <label htmlFor="agent-select" className="agent-label">
            <User size={16} />
            Select Agent for Single Test
          </label>
          <select
            id="agent-select"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            disabled={running || Object.keys(personas).length === 0}
            className="agent-select"
          >
            {Object.keys(personas).length === 0 ? (
              <option value="">Loading agents...</option>
            ) : (
              Object.entries(personas).map(([key, persona]) => (
                <option key={key} value={key}>
                  {persona.display_name} ({persona.category})
                </option>
              ))
            )}
          </select>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
            Test with a specific threat actor persona to understand their unique attack perspective
          </p>
        </div>

        {/* LLM Model Selection */}
        <div className="agent-selection">
          <label htmlFor="model-select" className="agent-label">
            <Zap size={16} />
            Select LLM Model
          </label>
          <select
            id="model-select"
            value={selectedModel || ''}
            onChange={(e) => setSelectedModel(e.target.value || null)}
            disabled={running || availableModels.length === 0}
            className="agent-select"
          >
            <option value="">Use default from .env</option>
            {availableModels.length === 0 ? (
              <option value="">Loading models...</option>
            ) : (
              availableModels.map((model) => (
                <option
                  key={`${model.provider}-${model.name}`}
                  value={model.name}
                  disabled={!model.available || model.is_wip}
                >
                  {model.display_name} {!model.available ? '(Not Available)' : model.is_wip ? '' : model.is_default ? '(Current Default)' : ''}
                </option>
              ))
            )}
          </select>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
            Choose which LLM model to use for threat modeling. Models marked "Work In Progress" are disabled. Leave as default to use the model configured in .env.
          </p>
        </div>

        {/* Execution Order Selection (for Stigmergic Swarm) */}
        <div className="agent-selection">
          <label htmlFor="execution-order-select" className="agent-label">
            <Network size={16} />
            Execution Order (for Multi-agents swarm)
          </label>
          <select
            id="execution-order-select"
            value={executionOrder}
            onChange={(e) => setExecutionOrder(e.target.value)}
            disabled={running}
            className="agent-select"
          >
            <option value="capability_ascending">Capability Ascending (least to most sophisticated)</option>
            <option value="random">Random Order (reduce bias)</option>
            <option value="threat_actor_first">Threat Actor First (real actors before archetypes)</option>
          </select>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
            Determines the order in which agents explore the infrastructure for stigmergic swarm runs
          </p>
        </div>

        <div className="run-buttons">
          <button
            className="btn btn-primary"
            onClick={() => runSwarm('full')}
            disabled={!selectedFile || running}
          >
            <Play size={16} />
            {running && currentPhase ? currentPhase : 'Multi-agents Run'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => runSwarm('quick')}
            disabled={!selectedFile || running}
          >
            <Zap size={16} />
            2 agents test
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => runSwarm('single')}
            disabled={!selectedFile || running || !selectedAgent}
          >
            <User size={16} />
            single agent run
          </button>
          <button
            className="btn btn-stigmergic"
            onClick={() => runSwarm('stigmergic')}
            disabled={!selectedFile || running}
            title="Stigmergic shared graph — agents build on each other's discoveries"
          >
            <Network size={16} />
            Multi-agents swarm Run
            <span className="badge-new">NEW</span>
          </button>
          {running && (
            <button
              className="btn btn-danger"
              onClick={handleCancelRun}
              title="Cancel running operation"
            >
              <StopCircle size={16} />
              Stop
            </button>
          )}
        </div>

        {running && (
          <div className="progress-indicator">
            <div className="progress-bar">
              <div className="progress-bar-fill"></div>
            </div>

            {/* Elapsed Time Display */}
            <div className="elapsed-time-display">
              <div className="elapsed-time-value">{formatElapsedTime(heartbeat)}</div>
              <div className="elapsed-time-label">Elapsed Time</div>
            </div>

            {/* Status Messages */}
            <p className="progress-text">
              {currentPhase || getContextualStatusMessage(heartbeat)}
            </p>

            {/* Heartbeat Indicators */}
            <div className="heartbeat-indicators">
              <div className="heartbeat-item">
                <div className={`heartbeat-pulse ${backendAlive ? 'alive' : 'dead'}`}></div>
                <span className="heartbeat-label">
                  Backend: {backendAlive ? 'Responsive' : 'Not Responding'}
                </span>
              </div>
              <div className="heartbeat-item">
                <div className="heartbeat-pulse alive"></div>
                <span className="heartbeat-label">Frontend: Active</span>
              </div>
              {lastBackendCheck && (
                <div className="heartbeat-item">
                  <span className="heartbeat-timestamp">
                    Last check: {lastBackendCheck.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* Long Operation Warning */}
            {heartbeat > 600 && (
              <div className="long-operation-notice">
                <AlertTriangle size={16} />
                <span>
                  Long-running operation detected. This is normal for comprehensive threat modeling with LLMs.
                  Expected duration: {currentPhase.includes('Quick') ? '14-20 minutes' : '25-30 minutes'}.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Threat Model Summary - High Level Overview */}
      {(activeTab === 'main' || activeTab === 'summary') && result && (
        <ThreatModelSummary result={result} />
      )}

      {/* Section B: Asset Graph View */}
      {(activeTab === 'main' || activeTab === 'architecture') && result && result.asset_graph && (
        <div className="asset-graph-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Infrastructure Asset Graph</h3>
            <button
              onClick={() => setShowAssetDetails(!showAssetDetails)}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {showAssetDetails ? (
                <>
                  <ChevronUp size={16} />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Show Details
                </>
              )}
            </button>
          </div>

          <div className="asset-summary-stats">
            <div className="stat-card">
              <span className="stat-value">{result.asset_graph.assets?.length || 0}</span>
              <span className="stat-label">Total Assets</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{result.asset_graph.relationships?.length || 0}</span>
              <span className="stat-label">Relationships</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{result.asset_graph.trust_boundaries?.length || 0}</span>
              <span className="stat-label">Trust Boundaries</span>
            </div>
          </div>

          {showAssetDetails && (
            <div className="asset-table-container">
              {Object.entries(groupAssetsByBoundary(result.asset_graph)).map(([boundary, assets]) => (
                <div key={boundary} className="boundary-group">
                  <h4 className="boundary-header">
                    <Shield size={16} />
                    {boundary}
                    <span className="boundary-count">({assets.length} assets)</span>
                  </h4>
                  <table className="asset-table">
                    <thead>
                      <tr>
                        <th>Asset Name</th>
                        <th>Type</th>
                        <th>Service</th>
                        <th>Internet Facing</th>
                        <th>Trust Boundary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset, idx) => (
                        <tr key={idx}>
                          <td className="asset-name">{asset.name}</td>
                          <td>{asset.type}</td>
                          <td>{asset.service}</td>
                          <td>
                            {asset.properties?.internet_facing ? (
                              <span className="badge badge-warning">Yes</span>
                            ) : (
                              <span className="badge badge-success">No</span>
                            )}
                          </td>
                          <td>{asset.trust_boundary || 'unknown'}</td>
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

      {/* Section C: Results View */}
      {/* Stigmergic Results View */}
      {activeTab === 'main' && result && result.run_type === 'multi_agents_swarm' && (
        <StigmergicResultsView results={result} />
      )}

      {/* Standard Results View */}
      {result && result.run_type !== 'multi_agents_swarm' && result.final_paths && (
        <div className="results-panel">
          {/* Executive Summary */}
          {activeTab === 'main' && result.executive_summary && (
            <div className="executive-summary">
              <h3>Executive Summary</h3>
              <p>{result.executive_summary}</p>
            </div>
          )}

          {/* Stats Bar */}
          {activeTab === 'main' && (
          <div className="results-stats-bar">
            <div className="stat-item">
              <span className="stat-label">Total Paths</span>
              <span className="stat-value">{result.final_paths.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Execution Time</span>
              <span className="stat-value">{Math.round(result.execution_time_seconds / 60)}m</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Coverage</span>
              <span className="stat-value">{result.adversarial_summary?.coverage_estimate || 'N/A'}</span>
            </div>
          </div>
          )}

          {/* CSA Risk Assessment Summary */}
          {(activeTab === 'main' || activeTab === 'risk-assessment') && result.csa_risk_assessment && (
            <CsaRiskSummary
              csaRiskAssessment={result.csa_risk_assessment}
            />
          )}

          {/* Attack Path Cards */}
          {(activeTab === 'main' || activeTab === 'attack-paths') && (
          <div className="attack-paths-list">
            <h3>Attack Paths ({result.final_paths.length})</h3>

            {/* Separate confirmed vuln paths from agent exploration paths */}
            {(() => {
              const paths = result.csa_risk_assessment?.scored_paths || result.final_paths || []

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

          {/* Mitigation Action Toolbar - Bottom of Attack Paths */}
          {(activeTab === 'main' || activeTab === 'mitigations') && (
          <div
            style={{
              backgroundColor: 'var(--color-primary)',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '16px 20px',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 24,
              marginBottom: 24,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {Object.values(selectedMitigations).filter(Boolean).length} mitigation(s) selected
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={clearAllMitigations}
                disabled={Object.values(selectedMitigations).filter(Boolean).length === 0}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: Object.values(selectedMitigations).filter(Boolean).length === 0 ? 'not-allowed' : 'pointer',
                  opacity: Object.values(selectedMitigations).filter(Boolean).length === 0 ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (Object.values(selectedMitigations).filter(Boolean).length > 0) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
                }}
              >
                Clear Selections
              </button>
              <button
                onClick={applyAllMitigations}
                disabled={analyzingMitigations}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: analyzingMitigations ? 'not-allowed' : 'pointer',
                  opacity: analyzingMitigations ? 0.5 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  if (!analyzingMitigations) {
                    e.currentTarget.style.backgroundColor = '#059669'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
                title="Automatically select and apply all mitigations from all attack paths"
              >
                {analyzingMitigations ? 'Analyzing...' : 'Apply All Mitigations & Analyze'}
              </button>
              <button
                onClick={applyMitigations}
                disabled={analyzingMitigations || Object.values(selectedMitigations).filter(Boolean).length === 0}
                style={{
                  padding: '10px 20px',
                  borderRadius: 6,
                  border: 'none',
                  backgroundColor: '#fff',
                  color: '#667eea',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (analyzingMitigations || Object.values(selectedMitigations).filter(Boolean).length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (analyzingMitigations || Object.values(selectedMitigations).filter(Boolean).length === 0) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
                onMouseEnter={(e) => {
                  if (!analyzingMitigations && Object.values(selectedMitigations).filter(Boolean).length > 0) {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                {analyzingMitigations ? 'Analyzing...' : 'Apply Mitigations & Analyze'}
              </button>
            </div>
          </div>
          )}

          {/* Comprehensive Mitigation Summary */}
          {(activeTab === 'main' || activeTab === 'mitigations') && (() => {
            const paths = result.csa_risk_assessment?.scored_paths || result.final_paths || []
            return (
              <MitigationSummary
                paths={paths}
                title="Comprehensive Mitigation Summary - All Attack Paths"
                selectedMitigations={selectedMitigations}
                toggleMitigationSelection={toggleMitigationSelection}
              />
            )
          })()}
        </div>
      )}

      {/* Post-Mitigation Analysis Section */}
      {(activeTab === 'main' || activeTab === 'post-mitigation') && postMitigationAnalysis && (
        <div className="results-container">
          <div className="results-header">
            <div>
              <h2>Post-Mitigation Risk Assessment</h2>
              <p>Residual risk levels after applying selected mitigations</p>
            </div>
          </div>

          {/* Residual Risk Summary - CSA Format */}
          {postMitigationAnalysis.residual_risk_assessment && (
            <ResidualRiskSummary
              residualRiskAssessment={postMitigationAnalysis.residual_risk_assessment}
              mitigationsApplied={Object.values(selectedMitigations).filter(Boolean).length}
            />
          )}

          {/* Post-Mitigation Attack Paths with Residual Risk Levels */}
          <div className="attack-paths-list">
            <h3>Attack Paths with Residual Risk ({postMitigationAnalysis.post_mitigation_paths.length})</h3>

            {(() => {
              const paths = postMitigationAnalysis.post_mitigation_paths || []

              // Separate paths by source
              const confirmedVulnPaths = paths.filter(p => p.source === 'confirmed_vuln_synthesis')
              const agentExplorationPaths = paths.filter(p => p.source !== 'confirmed_vuln_synthesis')

              // Sort by residual risk level
              const sortedConfirmed = [...confirmedVulnPaths].sort((a, b) => {
                const scoreA = a.residual_csa_risk_score?.risk_level ?? 0
                const scoreB = b.residual_csa_risk_score?.risk_level ?? 0
                return scoreB - scoreA
              })

              const sortedAgent = [...agentExplorationPaths].sort((a, b) => {
                const scoreA = a.residual_csa_risk_score?.risk_level ?? 0
                const scoreB = b.residual_csa_risk_score?.risk_level ?? 0
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
                          key={path.path_id || path.id || `residual-confirmed-${i}`}
                          path={path}
                          defaultExpanded={false}
                          selectedMitigations={selectedMitigations}
                          toggleMitigationSelection={null}
                        />
                      ))}
                    </div>
                  )}

                  {/* Agent Explorations */}
                  {sortedAgent.length > 0 && (
                    <AgentExplorationsSection
                      paths={sortedAgent}
                      selectedMitigations={selectedMitigations}
                      toggleMitigationSelection={null}
                    />
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

          </div> {/* Close tab-content */}
        </div> {/* Close main-content */}
      </div> {/* Close page-content-with-sidebar */}
    </div>
  );
}

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

export default ThreatModelPage;
