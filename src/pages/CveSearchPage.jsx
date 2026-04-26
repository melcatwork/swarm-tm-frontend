import React, { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { API_BASE_URL } from '../api/client'

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
})

const CVE_API_BASE = `${API_BASE_URL}/api/cve`

// MITRE ATT&CK tactic color palette
const TACTIC_COLORS = {
  'TA0001': { bg: '#00d4ff', border: '#00a8cc', name: 'Initial Access' },
  'TA0002': { bg: '#0ea5e9', border: '#0284c7', name: 'Execution' },
  'TA0003': { bg: '#8b5cf6', border: '#7c3aed', name: 'Persistence' },
  'TA0004': { bg: '#a855f7', border: '#9333ea', name: 'Privilege Escalation' },
  'TA0005': { bg: '#d946ef', border: '#c026d3', name: 'Defense Evasion' },
  'TA0006': { bg: '#f97316', border: '#ea580c', name: 'Credential Access' },
  'TA0007': { bg: '#fbbf24', border: '#f59e0b', name: 'Discovery' },
  'TA0008': { bg: '#facc15', border: '#eab308', name: 'Lateral Movement' },
  'TA0009': { bg: '#84cc16', border: '#65a30d', name: 'Collection' },
  'TA0010': { bg: '#22c55e', border: '#16a34a', name: 'Command and Control' },
  'TA0011': { bg: '#ef4444', border: '#dc2626', name: 'Exfiltration' },
  'TA0040': { bg: '#dc2626', border: '#b91c1c', name: 'Impact' },
}

const getTacticColors = (tacticId) => {
  return TACTIC_COLORS[tacticId] || { bg: '#666', border: '#444', name: 'Unknown' }
}

function CveSearchPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState('product')
  const [results, setResults] = useState(null)
  const [sortedCves, setSortedCves] = useState([])
  const [selectedCve, setSelectedCve] = useState(null)
  const [attackData, setAttackData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('search')
  const mermaidRef = useRef(null)

  useEffect(() => {
    if (attackData?.mermaid && mermaidRef.current) {
      renderMermaid(attackData.mermaid)
    }
  }, [attackData])

  const renderMermaid = async (graphDefinition) => {
    try {
      const { svg } = await mermaid.render('mermaid-graph', graphDefinition)
      mermaidRef.current.innerHTML = svg
    } catch (err) {
      console.error('Mermaid render error:', err)
      mermaidRef.current.innerHTML = '<p style="color: #ff6b6b;">Error rendering diagram</p>'
    }
  }

  const searchCves = async () => {
    if (!searchTerm.trim()) return

    setLoading(true)
    setError(null)
    setResults(null)
    setSortedCves([])
    setSelectedCve(null)
    setAttackData(null)

    try {
      const endpoint = searchType === 'product'
        ? `/search?product=${encodeURIComponent(searchTerm)}&limit=10`
        : `/${encodeURIComponent(searchTerm.toUpperCase())}`

      const response = await fetch(`${CVE_API_BASE}${endpoint}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setResults(data)

      // Sort CVEs by severity (highest first)
      const cves = data.cves || [data]
      const sorted = [...cves].sort((a, b) => {
        const scoreA = parseFloat(a.cvss_score) || 0
        const scoreB = parseFloat(b.cvss_score) || 0
        return scoreB - scoreA
      })
      setSortedCves(sorted)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getAttackMapping = async (cveId) => {
    setLoading(true)
    setError(null)
    setSelectedCve(cveId)

    try {
      const response = await fetch(`${CVE_API_BASE}/attack/${cveId}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setAttackData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchCves()
    }
  }

  return (
    <div className="cve-search-page" style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <header style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '30px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          ⚔️ CVE Intelligence
        </h1>
        <p style={{ color: '#888', fontSize: '1rem' }}>
          CVE Vulnerability Intelligence → MITRE ATT&CK Kill Chain
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <button
          onClick={() => setActiveTab('search')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'search' ? 'linear-gradient(90deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}
        >
          🔍 CVE Search
        </button>
        <button
          onClick={() => setActiveTab('cisa-kev')}
          style={{
            padding: '10px 20px',
            background: activeTab === 'cisa-kev' ? 'linear-gradient(90deg, #00d4ff, #7c3aed)' : 'rgba(255,255,255,0.05)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '600'
          }}
        >
          ⚠️ CISA KEV
        </button>
      </div>

      {activeTab === 'search' && (
        <>
          {/* Search Box */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '25px',
            borderRadius: '16px',
            marginBottom: '25px'
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => setSearchType('product')}
                style={{
                  padding: '8px 16px',
                  background: searchType === 'product' ? '#00d4ff' : 'transparent',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                By Product
              </button>
              <button
                onClick={() => setSearchType('cve')}
                style={{
                  padding: '8px 16px',
                  background: searchType === 'cve' ? '#00d4ff' : 'transparent',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                By CVE ID
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={searchType === 'product' ? 'e.g., log4j, exchange, cisco ios' : 'e.g., CVE-2021-44228'}
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  fontSize: '1rem',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid #333',
                  borderRadius: '10px',
                  color: '#fff',
                  outline: 'none'
                }}
              />
              <button
                onClick={searchCves}
                disabled={loading}
                style={{
                  padding: '14px 28px',
                  fontSize: '1rem',
                  background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  fontWeight: '600'
                }}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid #ff6b6b',
              padding: '18px',
              borderRadius: '12px',
              marginBottom: '25px',
              color: '#ff6b6b'
            }}>
              ⚠️ Error: {error}
            </div>
          )}

          {/* Main Content - Two Column Layout */}
          {results && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>

              {/* Left Column - Results List */}
              <div>
                <h2 style={{ marginBottom: '15px', color: '#00d4ff', fontSize: '1.3rem' }}>
                  {sortedCves.length} Result{sortedCves.length !== 1 ? 's' : ''}
                  {results.product && ` for "${results.product}"`}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
                  {sortedCves.map((cve, idx) => (
                    <div
                      key={cve.id || idx}
                      onClick={() => cve.id && getAttackMapping(cve.id)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '16px',
                        borderRadius: '10px',
                        cursor: cve.id ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        border: selectedCve === cve.id ? '1px solid #00d4ff' : '1px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ color: '#00d4ff', fontSize: '1.1rem' }}>{cve.id}</h3>
                        {cve.cvss_score && (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '15px',
                            background: cve.cvss_score >= 9 ? '#ff4757' : cve.cvss_score >= 7 ? '#ffa502' : '#2ed573',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }}>
                            {cve.cvss_score}
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {cve.description?.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Kill Chain & Details */}
              <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                {attackData ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px',
                    borderRadius: '16px'
                  }}>
                    {/* CVSS Score */}
                    {attackData.cvss && (
                      <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ color: '#00d4ff', margin: 0, fontSize: '1.2rem' }}>
                          {attackData.cve_id}
                        </h2>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '15px',
                          background: attackData.cvss.score >= 9 ? '#ff4757' : attackData.cvss.score >= 7 ? '#ffa502' : '#2ed573',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}>
                          CVSS {attackData.cvss.score} {attackData.cvss.severity}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '0.85rem', lineHeight: '1.5' }}>
                      {attackData.description}
                    </p>

                    {/* Kill Chain Section */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginBottom: '20px' }}>
                      <h3 style={{ marginBottom: '10px', color: '#7c3aed', fontSize: '0.95rem' }}>🎯 Kill Chain</h3>

                      {/* Techniques */}
                      {attackData.kill_chain?.length > 0 && (
                        <div style={{ marginBottom: '15px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {attackData.kill_chain.map((item, idx) => {
                              const colors = getTacticColors(item.tactic_id)

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    background: `${colors.bg}22`,
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: `2px solid ${colors.border}`,
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  <span style={{ color: colors.bg, fontWeight: 'bold' }}>
                                    Phase {item.phase}
                                  </span>
                                  <span style={{ margin: '0 6px', color: '#666' }}>→</span>
                                  <span style={{ color: '#fff' }}>{item.tactic_name}</span>
                                  <span style={{ margin: '0 6px', color: '#666' }}>→</span>
                                  <span style={{ color: colors.bg, fontFamily: 'monospace' }}>{item.technique_id}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Mermaid Visualization */}
                      <div>
                        <h4 style={{ marginBottom: '10px', color: '#7c3aed', fontSize: '0.9rem' }}>📊 Visualization</h4>
                        <div
                          ref={mermaidRef}
                          style={{
                            background: 'rgba(255,255,255,0.95)',
                            padding: '12px',
                            borderRadius: '8px',
                            minHeight: '180px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        />

                        {/* Mermaid Code */}
                        <details style={{ marginTop: '12px' }}>
                          <summary style={{ cursor: 'pointer', color: '#666', fontSize: '0.8rem' }}>
                            View Mermaid Code
                          </summary>
                          <pre style={{
                            background: 'rgba(0,0,0,0.5)',
                            padding: '10px',
                            borderRadius: '6px',
                            overflow: 'auto',
                            marginTop: '6px',
                            fontSize: '0.7rem'
                          }}>
                            {attackData.mermaid}
                          </pre>
                        </details>
                      </div>
                    </div>

                    {/* Patches */}
                    {attackData.patches?.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h3 style={{ marginBottom: '8px', color: '#2ed573', fontSize: '0.95rem' }}>🔧 Patches Available</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {attackData.patches.map((patch, idx) => (
                            <a
                              key={idx}
                              href={patch.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#2ed573',
                                fontSize: '0.8rem',
                                textDecoration: 'none',
                                background: 'rgba(46,213,115,0.1)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {patch.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mitigations */}
                    {attackData.mitigations?.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h3 style={{ marginBottom: '8px', color: '#ffa502', fontSize: '0.95rem' }}>🛡️ Mitigations</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {attackData.mitigations.map((m, idx) => (
                            <a
                              key={idx}
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#ffa502',
                                fontSize: '0.8rem',
                                textDecoration: 'none',
                                background: 'rgba(255,165,2,0.1)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {m.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detection */}
                    {attackData.detection?.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h3 style={{ marginBottom: '8px', color: '#00d4ff', fontSize: '0.95rem' }}>🔍 Detection Methods</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {attackData.detection.map((d, idx) => (
                            <a
                              key={idx}
                              href={d.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#00d4ff',
                                fontSize: '0.8rem',
                                textDecoration: 'none',
                                background: 'rgba(0,212,255,0.1)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {d.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recovery */}
                    {attackData.recovery?.length > 0 && (
                      <div style={{ marginBottom: '15px' }}>
                        <h3 style={{ marginBottom: '8px', color: '#ff4757', fontSize: '0.95rem' }}>♻️ Recovery Steps</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {attackData.recovery.map((r, idx) => (
                            <a
                              key={idx}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#ff4757',
                                fontSize: '0.8rem',
                                textDecoration: 'none',
                                background: 'rgba(255,71,87,0.1)',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {r.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '40px',
                    borderRadius: '16px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>👈 Select a CVE</p>
                    <p style={{ fontSize: '0.9rem' }}>Click on a vulnerability to see details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'cisa-kev' && (
        <CisaKevList />
      )}

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        marginTop: '40px',
        padding: '20px',
        color: '#666',
        borderTop: '1px solid rgba(255,255,255,0.1)'
      }}>
        <p style={{ fontSize: '0.9rem' }}>Data sources: NVD, CISA KEV, EPSS</p>
      </footer>
    </div>
  )
}

function CisaKevList() {
  const [vulns, setVulns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${CVE_API_BASE}/cisa-kev/list?limit=20`)
      .then(res => res.json())
      .then(data => setVulns(data.vulnerabilities || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ textAlign: 'center', color: '#666' }}>Loading CISA KEV...</p>
  if (error) return <p style={{ color: '#ff6b6b' }}>Error: {error}</p>

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color: '#ffa502' }}>
        ⚠️ CISA Known Exploited Vulnerabilities
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {vulns.map((vuln, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '18px',
              borderRadius: '12px',
              borderLeft: '4px solid #ffa502'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#ffa502' }}>{vuln.cve_id}</h3>
              <span style={{ color: '#666', fontSize: '0.85rem' }}>
                Added: {vuln.date_added}
              </span>
            </div>
            <p style={{ color: '#aaa', marginTop: '10px', fontSize: '0.95rem' }}>
              {vuln.vendor} → {vuln.product}
            </p>
            <p style={{ color: '#666', marginTop: '8px', fontSize: '0.85rem' }}>
              {vuln.short_description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CveSearchPage
