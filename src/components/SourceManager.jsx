import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { getSources, addSource, toggleSource, removeSource } from '../api/client';
import Toast from './Toast';
import './SourceManager.css';

function SourceManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Add source form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    adapter: 'hackernews_rss',
    feed_url: '',
    refresh_minutes: 60,
    enabled: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSources();
    }
  }, [isOpen]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const data = await getSources();
      setSources(data);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
      setToast({
        message: 'Failed to load sources',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSource = async (name, currentEnabled) => {
    try {
      await toggleSource(name, !currentEnabled);
      setToast({
        message: `Source ${!currentEnabled ? 'enabled' : 'disabled'} successfully`,
        type: 'success',
      });
      await fetchSources();
    } catch (err) {
      console.error('Failed to toggle source:', err);
      setToast({
        message: 'Failed to toggle source',
        type: 'error',
      });
    }
  };

  const handleDeleteSource = async (name) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the source "${name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await removeSource(name);
      setToast({
        message: 'Source deleted successfully',
        type: 'success',
      });
      await fetchSources();
    } catch (err) {
      console.error('Failed to delete source:', err);
      setToast({
        message: 'Failed to delete source',
        type: 'error',
      });
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();

    // Build config based on adapter type
    const config = {};
    if (formData.adapter === 'hackernews_rss') {
      config.feed_url = formData.feed_url;
    } else if (formData.adapter === 'nvd_cve') {
      config.api_url = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
      config.results_per_page = 20;
    } else if (formData.adapter === 'attack_stix') {
      config.stix_url = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json';
    }

    const sourceConfig = {
      name: formData.name,
      adapter: formData.adapter,
      enabled: formData.enabled,
      refresh_minutes: parseInt(formData.refresh_minutes),
      config,
    };

    try {
      setSubmitting(true);
      await addSource(sourceConfig);
      setToast({
        message: 'Source added successfully',
        type: 'success',
      });

      // Reset form
      setFormData({
        name: '',
        adapter: 'hackernews_rss',
        feed_url: '',
        refresh_minutes: 60,
        enabled: true,
      });
      setShowAddForm(false);

      // Refresh sources list
      await fetchSources();
    } catch (err) {
      console.error('Failed to add source:', err);
      setToast({
        message: err.response?.data?.detail || 'Failed to add source',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getAdapterDisplayName = (adapter) => {
    const names = {
      nvd_cve: 'NVD CVE',
      hackernews_rss: 'RSS Feed',
      attack_stix: 'ATT&CK STIX',
    };
    return names[adapter] || adapter;
  };

  return (
    <div className="source-manager">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <button
        className="source-manager-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Manage Sources</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div className="source-manager-content">
          {loading ? (
            <div className="source-manager-loading">
              <div className="spinner"></div>
              <p>Loading sources...</p>
            </div>
          ) : (
            <>
              <div className="sources-table-container">
                <table className="sources-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Adapter Type</th>
                      <th>Refresh Interval</th>
                      <th>Status</th>
                      <th>Enabled</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="no-sources">
                          No sources configured
                        </td>
                      </tr>
                    ) : (
                      sources.map((source) => (
                        <tr key={source.source_name}>
                          <td className="source-name">{source.source_name}</td>
                          <td>
                            {getAdapterDisplayName(
                              // Extract adapter from source name (we don't have it in FeedStatus)
                              source.source_name.includes('NVD')
                                ? 'nvd_cve'
                                : source.source_name.includes('Hacker')
                                ? 'hackernews_rss'
                                : source.source_name.includes('ATT&CK')
                                ? 'attack_stix'
                                : 'unknown'
                            )}
                          </td>
                          <td>
                            {/* We don't have refresh_minutes in FeedStatus, show N/A */}
                            N/A
                          </td>
                          <td>
                            <span
                              className={`status-indicator ${
                                source.healthy ? 'healthy' : 'unhealthy'
                              }`}
                            >
                              <span className="status-dot"></span>
                              {source.healthy ? 'Healthy' : 'Unhealthy'}
                            </span>
                            {source.error && (
                              <div className="error-message">{source.error}</div>
                            )}
                          </td>
                          <td>
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={source.healthy} // Using healthy as proxy for enabled
                                onChange={() =>
                                  handleToggleSource(
                                    source.source_name,
                                    source.healthy
                                  )
                                }
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </td>
                          <td>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteSource(source.source_name)}
                              title="Delete source"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="add-source-section">
                {!showAddForm ? (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus size={16} />
                    Add Source
                  </button>
                ) : (
                  <form className="add-source-form" onSubmit={handleAddSource}>
                    <div className="form-header">
                      <h3>Add New Source</h3>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => setShowAddForm(false)}
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="source-name">
                          Name <span className="required">*</span>
                        </label>
                        <input
                          id="source-name"
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                          placeholder="e.g., Custom RSS Feed"
                        />
                      </div>

                      <div className="form-field">
                        <label htmlFor="adapter-type">
                          Adapter Type <span className="required">*</span>
                        </label>
                        <select
                          id="adapter-type"
                          value={formData.adapter}
                          onChange={(e) =>
                            setFormData({ ...formData, adapter: e.target.value })
                          }
                          required
                        >
                          <option value="hackernews_rss">RSS Feed</option>
                          <option value="nvd_cve">NVD CVE</option>
                          <option value="attack_stix">ATT&CK STIX</option>
                        </select>
                      </div>

                      {formData.adapter === 'hackernews_rss' && (
                        <div className="form-field form-field-full">
                          <label htmlFor="feed-url">
                            Feed URL <span className="required">*</span>
                          </label>
                          <input
                            id="feed-url"
                            type="url"
                            value={formData.feed_url}
                            onChange={(e) =>
                              setFormData({ ...formData, feed_url: e.target.value })
                            }
                            required
                            placeholder="https://example.com/feed.xml"
                          />
                        </div>
                      )}

                      <div className="form-field">
                        <label htmlFor="refresh-minutes">
                          Refresh Interval (minutes) <span className="required">*</span>
                        </label>
                        <input
                          id="refresh-minutes"
                          type="number"
                          min="1"
                          value={formData.refresh_minutes}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              refresh_minutes: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="form-field form-field-checkbox">
                        <label>
                          <input
                            type="checkbox"
                            checked={formData.enabled}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                enabled: e.target.checked,
                              })
                            }
                          />
                          <span>Enabled</span>
                        </label>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? 'Adding...' : 'Add Source'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SourceManager;
