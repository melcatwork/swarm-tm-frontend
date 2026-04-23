/**
 * API client for Swarm TM backend
 *
 * Provides functions for making API requests with consistent error handling
 * and user-friendly error messages.
 */

import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 1800000, // 30 minutes (increased for long-running LLM operations)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Format error message from API response
 * @param {Error} error - Axios error object
 * @returns {string} User-friendly error message
 */
const formatErrorMessage = (error) => {
  if (!error.response) {
    // Network error - backend unreachable
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return `Cannot connect to backend. Please ensure the API server is running at ${apiUrl}`;
  }

  const { status, data } = error.response;

  // Handle structured error responses
  if (data && typeof data === 'object') {
    if (data.detail) {
      // FastAPI detail field
      if (typeof data.detail === 'string') {
        return data.detail;
      }
      if (data.detail.message) {
        return data.detail.message;
      }
      if (data.detail.error) {
        return `${data.detail.error}: ${data.detail.message || ''}`;
      }
    }
    if (data.message) {
      return data.message;
    }
    if (data.error) {
      return data.error;
    }
  }

  // Default messages by status code
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Unauthorized. Please log in.';
    case 403:
      return 'Access forbidden.';
    case 404:
      return 'Resource not found.';
    case 413:
      return 'File too large. Maximum file size is 1MB.';
    case 422:
      return 'Invalid data format. Please check your input.';
    case 500:
      return 'Internal server error. Please try again later.';
    case 503:
      return 'Service unavailable. LLM provider may not be configured.';
    case 504:
      return 'Request timeout. The operation took too long to complete.';
    default:
      return `Request failed with status ${status}`;
  }
};

/**
 * Get threat intelligence items
 * @param {Object} params - Query parameters (category, severity, limit)
 * @returns {Promise<Array>} List of threat intel items
 * @throws {Error} With user-friendly message on failure
 */
export const getIntelItems = async (params = {}) => {
  try {
    const response = await apiClient.get('/api/intel/items', { params });
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Manually trigger a pull from all threat intelligence sources
 * @returns {Promise<Object>} Pull result with status and count
 */
export const pullLatestIntel = async () => {
  const response = await apiClient.post('/api/intel/pull');
  return response.data;
};

/**
 * Force update of MITRE ATT&CK techniques
 * @returns {Promise<Object>} Update result with status and count
 */
export const updateTTPLibrary = async () => {
  const response = await apiClient.post('/api/intel/update-ttp');
  return response.data;
};

/**
 * Get status of all configured threat intelligence sources
 * @returns {Promise<Array>} List of source statuses
 */
export const getSources = async () => {
  const response = await apiClient.get('/api/intel/sources');
  return response.data;
};

/**
 * Add a new threat intelligence source
 * @param {Object} config - Source configuration
 * @returns {Promise<Object>} Result with status and source name
 */
export const addSource = async (config) => {
  const response = await apiClient.post('/api/intel/sources', config);
  return response.data;
};

/**
 * Enable or disable a threat intelligence source
 * @param {string} name - Source name
 * @param {boolean} enabled - Enabled state
 * @returns {Promise<Object>} Result with status
 */
export const toggleSource = async (name, enabled) => {
  const response = await apiClient.put(`/api/intel/sources/${name}/toggle`, { enabled });
  return response.data;
};

/**
 * Remove a threat intelligence source
 * @param {string} name - Source name
 * @returns {Promise<Object>} Result with status
 */
export const removeSource = async (name) => {
  const response = await apiClient.delete(`/api/intel/sources/${name}`);
  return response.data;
};

/**
 * Check API health
 * @returns {Promise<Object>} Health status
 */
export const checkHealth = async () => {
  const response = await apiClient.get('/api/health');
  return response.data;
};

/**
 * Upload IaC file and run full threat modeling swarm (all enabled agents)
 * @param {File} file - IaC file (.tf, .yaml, .yml, or .json)
 * @param {string} model - Optional model name to use (e.g., "qwen3:14b", "gemma4:e4b")
 * @returns {Promise<Object>} Complete threat model with final paths, mitigations, scores
 * @throws {Error} With user-friendly message on failure
 */
export const uploadAndRunSwarm = async (file, model = null, impactScore = 3, cancelToken = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (model) {
      formData.append('model', model);
    }
    formData.append('impact_score', impactScore);

    const response = await apiClient.post('/api/swarm/run', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1800000, // 30 minutes for full pipeline (increased for larger models)
      cancelToken: cancelToken, // Support request cancellation
    });
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Upload IaC file and run quick threat modeling swarm (2 agents)
 * @param {File} file - IaC file (.tf, .yaml, .yml, or .json)
 * @param {string} model - Optional model name to use (e.g., "qwen3:14b", "gemma4:e4b")
 * @returns {Promise<Object>} Complete threat model with final paths, mitigations, scores
 * @throws {Error} With user-friendly message on failure
 */
export const uploadAndRunQuick = async (file, model = null, impactScore = 3, cancelToken = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (model) {
      formData.append('model', model);
    }
    formData.append('impact_score', impactScore);

    const response = await apiClient.post('/api/swarm/run/quick', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1200000, // 20 minutes for quick pipeline (increased for larger models)
      cancelToken: cancelToken, // Support request cancellation
    });
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Upload IaC file and run single agent threat modeling test
 * @param {File} file - IaC file (.tf, .yaml, .yml, or .json)
 * @param {string} agentName - Name of the persona to use
 * @param {string} model - Optional model name to use (e.g., "qwen3:14b", "gemma4:e4b")
 * @returns {Promise<Object>} Complete threat model with final paths, mitigations, scores
 * @throws {Error} With user-friendly message on failure
 */
export const uploadAndRunSingleAgent = async (file, agentName, model = null, impactScore = 3, cancelToken = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (model) {
      formData.append('model', model);
    }
    formData.append('impact_score', impactScore);

    const response = await apiClient.post(`/api/swarm/run/single?agent_name=${agentName}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 1200000, // 20 minutes for single agent pipeline (increased for larger models)
      cancelToken: cancelToken, // Support request cancellation
    });
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Upload IaC file and run stigmergic swarm exploration (Phase 10)
 * @param {File} file - IaC file (.tf, .yaml, .yml, or .json)
 * @param {string} executionOrder - Persona ordering strategy (capability_ascending, random, threat_actor_first)
 * @param {string} model - Optional model name to use (e.g., "qwen3:14b", "gemma4:e4b")
 * @returns {Promise<Object>} Stigmergic swarm results with attack paths, shared graph, emergent insights
 * @throws {Error} With user-friendly message on failure
 */
export const uploadAndRunStigmergic = async (file, executionOrder = 'capability_ascending', model = null, impactScore = 3, cancelToken = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (model) {
      formData.append('model', model);
    }
    formData.append('impact_score', impactScore);

    const response = await apiClient.post(`/api/swarm/run/stigmergic?execution_order=${executionOrder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 2400000, // 40 minutes for stigmergic swarm (sequential execution of multiple agents)
      cancelToken: cancelToken, // Support request cancellation
    });
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Get all available personas
 * @returns {Promise<Object>} Dictionary of personas
 */
export const getPersonas = async () => {
  try {
    const response = await apiClient.get('/api/swarm/personas');
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Get all available LLM models from .env configuration
 * @returns {Promise<Object>} Object with current_provider, current_model, and models array
 * @throws {Error} With user-friendly message on failure
 */
export const getAvailableModels = async () => {
  try {
    const response = await apiClient.get('/api/llm/models');
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Get current LLM status and configuration
 * @returns {Promise<Object>} LLM status with provider, model, availability
 * @throws {Error} With user-friendly message on failure
 */
export const getLLMStatus = async () => {
  try {
    const response = await apiClient.get('/api/llm/status');
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Get swarm status (placeholder for future async status checking)
 * @returns {Promise<Object>} Swarm execution status
 */
export const getSwarmStatus = async () => {
  // Placeholder for future implementation if swarm becomes async
  const response = await apiClient.get('/api/swarm/status');
  return response.data;
};

/**
 * Analyze attack paths after applying user-selected mitigations
 * @param {Array} attackPaths - Original attack paths from threat modeling
 * @param {Array} selectedMitigations - User-selected mitigations with format:
 *   [{path_id: string, step_number: number, mitigation_id: string, selected: boolean}, ...]
 * @returns {Promise<Object>} Post-mitigation analysis with residual risk assessment
 * @throws {Error} With user-friendly message on failure
 */
export const analyzePostMitigation = async (attackPaths, selectedMitigations) => {
  try {
    const response = await apiClient.post('/api/swarm/post-mitigation/analyze', {
      attack_paths: attackPaths,
      selected_mitigations: selectedMitigations,
    }, {
      timeout: 60000, // 1 minute for analysis
    });
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Get all archived threat modeling runs (metadata only)
 * @returns {Promise<Object>} List of archived runs with metadata
 * @throws {Error} With user-friendly message on failure
 */
export const getArchivedRuns = async () => {
  try {
    const response = await apiClient.get('/api/archive/runs');
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Get complete data for a specific archived run
 * @param {string} runId - Run ID to retrieve
 * @returns {Promise<Object>} Complete archived run with all data
 * @throws {Error} With user-friendly message on failure
 */
export const getArchivedRun = async (runId) => {
  try {
    const response = await apiClient.get(`/api/archive/runs/${runId}`);
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Update the name of an archived run
 * @param {string} runId - Run ID to update
 * @param {string} newName - New name for the run
 * @returns {Promise<Object>} Update response
 * @throws {Error} With user-friendly message on failure
 */
export const updateRunName = async (runId, newName) => {
  try {
    const response = await apiClient.put('/api/archive/runs/name', {
      run_id: runId,
      new_name: newName,
    });
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Delete an archived run
 * @param {string} runId - Run ID to delete
 * @returns {Promise<Object>} Deletion confirmation
 * @throws {Error} With user-friendly message on failure
 */
export const deleteArchivedRun = async (runId) => {
  try {
    const response = await apiClient.delete(`/api/archive/runs/${runId}`);
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Get archive statistics
 * @returns {Promise<Object>} Archive statistics
 * @throws {Error} With user-friendly message on failure
 */
export const getArchiveStats = async () => {
  try {
    const response = await apiClient.get('/api/archive/stats');
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Cancel a running threat modeling job
 * @param {string} jobId - Job ID to cancel
 * @returns {Promise<Object>} Cancellation response
 * @throws {Error} With user-friendly message on failure
 */
export const cancelRun = async (jobId) => {
  try {
    const response = await apiClient.post(`/api/swarm/cancel/${jobId}`);
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

/**
 * Configure AWS Bedrock bearer token
 * @param {Object} config - AWS bearer token configuration
 * @param {string} config.aws_bearer_token - AWS Bedrock bearer token
 * @param {string} config.aws_region - AWS Region (default: us-east-1)
 * @returns {Promise<Object>} Configuration result with available models
 * @throws {Error} With user-friendly message on failure
 */
export const configureBedrockCredentials = async (config) => {
  try {
    const response = await apiClient.post('/api/llm/bedrock/configure', config);
    return response.data;
  } catch (error) {
    const message = formatErrorMessage(error);
    throw new Error(message);
  }
};

export default apiClient;
