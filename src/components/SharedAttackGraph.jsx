/**
 * SharedAttackGraph Component - React Flow Implementation
 *
 * Visualization of multi-agent stigmergic attack path discovery
 * using swim lane layout with React Flow for robust rendering and interaction
 */

import {
  useState, useEffect, useMemo, useCallback, useRef
} from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  MarkerType,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Phase configuration
const PHASES = [
  { key: 'initial',   color: '#D85A30',
    label: 'Initial Access / Reconnaissance',
    matches: ['initial','recon'] },
  { key: 'execution', color: '#7F77DD',
    label: 'Execution & Persistence',
    matches: ['execut','persist'] },
  { key: 'lateral',   color: '#1D9E75',
    label: 'Lateral Movement / Priv. Escalation',
    matches: ['lateral','priv','movement'] },
  { key: 'objective', color: '#BA7517',
    label: 'Objective',
    matches: ['object','exfil','impact','collection'] },
  { key: 'covering',  color: '#888780',
    label: 'Covering Tracks',
    matches: ['cover','track','evas','clear'] },
];

const getPhase = (kill_chain_phase = '') => {
  const p = kill_chain_phase.toLowerCase().replace(/_/g, ' ');
  return PHASES.find(ph => ph.matches.some(m => p.includes(m)))
    ?? PHASES[PHASES.length - 1];
};

const nodeRadius = (pheromone_strength = 1) => {
  if (pheromone_strength < 1.0) return 18;
  if (pheromone_strength < 1.5) return 24;
  if (pheromone_strength < 2.0) return 30;
  if (pheromone_strength < 2.5) return 38;
  return 46;
};

// Layout constants
const LANE_LABEL_WIDTH = 220;
const LANE_PADDING_RIGHT = 120;
const LANE_HEIGHT = 200;
const LANE_X_START = 220;
const LANE_WIDTH = 1600;

// =============================================================================
// CUSTOM NODE COMPONENTS (MODULE LEVEL - STABLE REFERENCES)
// =============================================================================

// LaneNode - Swim lane background that moves and scales with zoom
const LaneNode = ({ data }) => {
  return (
    <>
      {/* Lane background with low opacity */}
      <div
        style={{
          width: data.width,
          height: data.height,
          background: data.color,
          opacity: 0.08,
          borderTop: `1px solid ${data.color}33`,
          borderRadius: 0,
          pointerEvents: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      {/* Lane label with full opacity (separate layer) */}
      <div style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 13,
        fontWeight: 600,
        color: data.color,
        opacity: 1,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        lineHeight: 1.4,
        zIndex: 1,
      }}>
        {data.label.split('/').map((line, i) => (
          <div key={i}>{line.trim()}</div>
        ))}
      </div>
    </>
  );
};

// AttackNode - Technique node circle
const AttackNode = ({ data, selected }) => {
  const { radius, phase, technique_id, technique_name,
          pheromone_strength, times_reinforced,
          asset_id, deposited_by } = data;
  const r = radius;
  const diameter = r * 2;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 8,
          height: 8,
          background: phase.color,
          border: `2px solid ${phase.color}`,
          opacity: 0,
          left: -4,
          top: '50%',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 8,
          height: 8,
          background: phase.color,
          border: `2px solid ${phase.color}`,
          opacity: 0,
          right: -4,
          top: '50%',
        }}
      />

      <div
        title={`${technique_id}: ${technique_name}\nAsset: ${asset_id}\nBy: ${deposited_by}\nPheromone: ${pheromone_strength?.toFixed(1)}\nReinforced: ${times_reinforced}x`}
        style={{
          width: diameter,
          height: diameter,
          borderRadius: '50%',
          background: phase.color,
          opacity: 0.88,
          border: selected
            ? `3px solid ${phase.color}`
            : `1.5px solid ${phase.color}`,
          boxShadow: selected
            ? `0 0 0 4px ${phase.color}44`
            : times_reinforced > 0
              ? `0 0 0 3px ${phase.color}33`
              : 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'box-shadow 0.2s, border 0.2s, opacity 0.2s',
          boxSizing: 'border-box',
          overflow: 'hidden',
          padding: 4,
        }}
      >
        <div style={{
          color: 'white',
          fontWeight: 600,
          fontSize: Math.min(12, r * 0.5),
          lineHeight: 1.1,
          textAlign: 'center',
        }}>
          {technique_id}
        </div>
        {r >= 26 && (
          <div style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: Math.min(9, r * 0.35),
            textAlign: 'center',
            lineHeight: 1.2,
            marginTop: 2,
            maxWidth: diameter - 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {technique_name?.slice(0, 16)}
          </div>
        )}
      </div>
    </>
  );
};

// =============================================================================
// LAYOUT COMPUTATION
// =============================================================================

const computeLayout = (rawNodes, rawEdges) => {
  const lanes = {};
  PHASES.forEach(p => { lanes[p.key] = []; });
  rawNodes.forEach(n => {
    const phase = getPhase(n.kill_chain_phase);
    lanes[phase.key].push(n);
  });

  const incomingCount = {};
  rawNodes.forEach(n => { incomingCount[n.node_id] = 0; });
  rawEdges.forEach(e => {
    const tgt = typeof e.target === 'object'
      ? e.target.node_id : e.target;
    if (incomingCount[tgt] !== undefined) incomingCount[tgt]++;
  });

  const positionedNodes = [];
  PHASES.forEach((phase, laneIndex) => {
    const nodesInLane = lanes[phase.key];
    nodesInLane.sort((a, b) =>
      (incomingCount[b.node_id] ?? 0) - (incomingCount[a.node_id] ?? 0)
    );
    const count = nodesInLane.length;
    nodesInLane.forEach((n, idx) => {
      const r = nodeRadius(n.pheromone_strength);
      const nodeX = LANE_LABEL_WIDTH +
        (count === 1
          ? LANE_WIDTH / 2
          : (idx / Math.max(count - 1, 1)) * LANE_WIDTH);
      const staggerY = count > 4 && idx % 2 === 1 ? 35 : -35;
      const nodeCentreY = laneIndex * LANE_HEIGHT + LANE_HEIGHT / 2 + staggerY;
      const nodeTopY = nodeCentreY - r;
      const nodeLeftX = nodeX - r;
      positionedNodes.push({
        n,
        x: nodeLeftX,
        y: nodeTopY,
        r,
        phase
      });
    });
  });

  return positionedNodes;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SharedAttackGraph({
  data,
  coverageGaps = [],
  convergentPaths = []
}) {
  const [clickedNodeId, setClickedNodeId] = useState(null);
  const [activePaths, setActivePaths] = useState([]);
  const [visibleHops, setVisibleHops] = useState(new Set());
  const animTimerRef = useRef(null);

  // Register node types (stable reference)
  const nodeTypes = useMemo(() => ({
    attackNode: AttackNode,
    laneNode: LaneNode,
  }), []);

  // Error handling
  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: 'var(--color-text-secondary)',
        fontSize: '1rem'
      }}>
        {!data ? 'No graph data available' : 'No attack paths were discovered'}
      </div>
    );
  }

  // Helper to resolve node IDs from edge references
  const resolveId = (ref) =>
    typeof ref === 'object' && ref !== null
      ? (ref.node_id ?? ref.id ?? String(ref))
      : String(ref);

  // Path traversal algorithms
  const getForwardPaths = useCallback((startNodeId, edges, maxDepth = 10) => {
    const paths = [];
    const traverse = (currentId, currentPath, depth) => {
      if (depth > maxDepth) return;
      const outgoing = edges.filter(e =>
        resolveId(e.source) === currentId
      );
      if (outgoing.length === 0) {
        paths.push([...currentPath]);
        return;
      }
      outgoing.forEach(edge => {
        const targetId = resolveId(edge.target);
        if (currentPath.includes(targetId)) return;
        traverse(targetId, [...currentPath, targetId], depth + 1);
      });
    };
    traverse(startNodeId, [startNodeId], 0);
    return paths;
  }, []);

  const getBackwardPaths = useCallback((endNodeId, edges, maxDepth = 10) => {
    const paths = [];
    const traverse = (currentId, currentPath, depth) => {
      if (depth > maxDepth) return;
      const incoming = edges.filter(e =>
        resolveId(e.target) === currentId
      );
      if (incoming.length === 0) {
        paths.push([...currentPath].reverse());
        return;
      }
      incoming.forEach(edge => {
        const sourceId = resolveId(edge.source);
        if (currentPath.includes(sourceId)) return;
        traverse(sourceId, [...currentPath, sourceId], depth + 1);
      });
    };
    traverse(endNodeId, [endNodeId], 0);
    return paths;
  }, []);

  const getFullPathsThroughNode = useCallback((nodeId, edges) => {
    const forward = getForwardPaths(nodeId, edges);
    const backward = getBackwardPaths(nodeId, edges);

    if (backward.length === 0 && forward.length === 0) return [[nodeId]];

    const fullPaths = new Set();

    if (backward.length === 0) {
      forward.forEach(p => fullPaths.add(JSON.stringify(p)));
    } else if (forward.length === 0) {
      backward.forEach(p => fullPaths.add(JSON.stringify(p)));
    } else {
      backward.forEach(bPath => {
        forward.forEach(fPath => {
          const merged = [...bPath, ...fPath.slice(1)];
          fullPaths.add(JSON.stringify(merged));
        });
      });
    }

    return Array.from(fullPaths).map(p => JSON.parse(p));
  }, [getForwardPaths, getBackwardPaths]);

  // Compute layout
  const positionedNodes = useMemo(() => {
    return computeLayout(data.nodes || [], data.edges || []);
  }, [data.nodes, data.edges]);

  // Create lane background nodes
  const totalLaneWidth = LANE_WIDTH + LANE_LABEL_WIDTH + LANE_PADDING_RIGHT;
  const laneRfNodes = useMemo(() => {
    return PHASES.map((phase, i) => ({
      id: `lane-${phase.key}`,
      type: 'laneNode',
      position: {
        x: 0,
        y: i * LANE_HEIGHT,
      },
      data: {
        label: phase.label,
        color: phase.color,
        width: totalLaneWidth,
        height: LANE_HEIGHT,
      },
      style: {
        width: totalLaneWidth,
        height: LANE_HEIGHT,
        padding: 0,
        border: 'none',
        borderRadius: 0,
      },
      draggable: false,
      selectable: false,
      focusable: false,
      zIndex: 0,
    }));
  }, []);

  // Create attack nodes
  const attackRfNodes = useMemo(() => {
    return positionedNodes.map(({ n, x, y, r, phase }) => ({
      id: n.node_id,
      type: 'attackNode',
      position: { x, y },
      data: {
        ...n,
        radius: r,
        phase,
      },
      style: {
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        padding: 0,
        border: 'none',
        background: 'transparent',
        zIndex: 10,
      },
      draggable: true,
    }));
  }, [positionedNodes]);

  // Combine lane nodes with attack nodes (lanes render first = behind)
  const allRfNodes = useMemo(() => {
    return [...laneRfNodes, ...attackRfNodes];
  }, [laneRfNodes, attackRfNodes]);

  // Filter valid edges
  const validNodeIds = useMemo(() => {
    return new Set((data.nodes || []).map(n => n.node_id));
  }, [data.nodes]);

  const validEdges = useMemo(() => {
    return (data.edges || []).filter(e => {
      const srcId = resolveId(e.source);
      const tgtId = resolveId(e.target);
      const valid = validNodeIds.has(srcId) && validNodeIds.has(tgtId);
      if (!valid) {
        console.warn('[SAG] Dropping invalid edge:', srcId, '->', tgtId);
      }
      return valid;
    });
  }, [data.edges, validNodeIds]);

  // Convert to React Flow edges
  const rfEdges = useMemo(() => {
    return validEdges.map((e, i) => {
      const srcId = resolveId(e.source);
      const tgtId = resolveId(e.target);
      const srcNode = data.nodes.find(n => n.node_id === srcId);
      const phase = srcNode ? getPhase(srcNode.kill_chain_phase)
                            : PHASES[PHASES.length - 1];
      const color = phase.color;
      const tr = e.times_reinforced ?? 0;

      return {
        id: `edge-${i}-${srcId}-${tgtId}`,
        source: srcId,
        target: tgtId,
        type: 'default',
        animated: tr >= 2,
        style: {
          stroke: color,
          strokeWidth: Math.max(2, tr === 0 ? 2
                                   : tr <= 2  ? 3
                                   : tr <= 4  ? 5
                                   : 7),
          opacity: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: color,
        },
        label: tr > 0 ? `${tr + 1} agents` : undefined,
        labelStyle: {
          fontSize: 10,
          fill: color,
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: '#ffffff',
          fillOpacity: 0.85,
        },
        data: { ...e, srcId, tgtId },
      };
    });
  }, [validEdges, data.nodes]);

  // Debug logging
  useEffect(() => {
    if (!data) return;
    console.log('[SAG] nodes:', data.nodes?.length ?? 0);
    console.log('[SAG] edges:', data.edges?.length ?? 0);
    console.log('[SAG] sample edge (raw):', data.edges?.[0] ?? 'none');
    console.log('[SAG] valid node ids (first 5):',
      [...validNodeIds].slice(0, 5));
    console.log('[SAG] rfEdges built:', rfEdges.length);
    if (rfEdges.length > 0) {
      console.log('[SAG] sample rfEdge:', rfEdges[0]);
    }
  }, [data, validNodeIds, rfEdges]);

  // Apply selection styling to nodes
  const styledNodes = useMemo(() => {
    if (!clickedNodeId) return allRfNodes;
    const allActiveIds = new Set(activePaths.flat());
    return allRfNodes.map(n => {
      if (n.type === 'laneNode') return n;
      return {
        ...n,
        data: {
          ...n.data,
          _dimmed: !allActiveIds.has(n.id),
          _selected: n.id === clickedNodeId,
        },
        style: {
          ...n.style,
          opacity: allActiveIds.has(n.id) ? 1 : 0.12,
          zIndex: allActiveIds.has(n.id) ? 20 : 10,
        },
      };
    });
  }, [clickedNodeId, activePaths, allRfNodes]);

  // Apply selection styling to edges
  const styledEdges = useMemo(() => {
    if (!clickedNodeId) {
      return rfEdges.map(e => ({
        ...e,
        style: { ...e.style, opacity: 1 },
      }));
    }
    return rfEdges.map(e => {
      const key = `${e.data?.srcId}->${e.data?.tgtId}`;
      const isVisible = visibleHops.has(key);
      const isOnActivePath = activePaths.some(path =>
        path.some((id, i) =>
          i < path.length - 1 &&
          id === e.data?.srcId &&
          path[i+1] === e.data?.tgtId
        )
      );
      return {
        ...e,
        animated: isOnActivePath && isVisible,
        style: {
          ...e.style,
          opacity: isOnActivePath
            ? (isVisible ? 1 : 0.2)
            : 0.06,
          strokeWidth: isVisible
            ? Math.max(e.style?.strokeWidth ?? 2, 3)
            : e.style?.strokeWidth ?? 2,
        },
      };
    });
  }, [clickedNodeId, visibleHops, rfEdges, activePaths]);

  // Node click handler
  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'laneNode') return;
    if (clickedNodeId === node.id) {
      clearSelection();
      return;
    }

    const paths = getFullPathsThroughNode(
      node.id,
      data.edges || []
    );

    setClickedNodeId(node.id);
    setActivePaths(paths);

    // Show first hop immediately
    const revealedHops = new Set();
    paths.forEach(path => {
      if (path.length > 1) revealedHops.add(`${path[0]}->${path[1]}`);
    });
    setVisibleHops(new Set(revealedHops));

    // Animate remaining hops
    const maxLen = Math.max(...paths.map(p => p.length), 1);
    if (animTimerRef.current) clearInterval(animTimerRef.current);

    let step = 1;
    animTimerRef.current = setInterval(() => {
      step++;
      paths.forEach(path => {
        if (step < path.length) {
          revealedHops.add(`${path[step-1]}->${path[step]}`);
        }
      });
      setVisibleHops(new Set(revealedHops));
      if (step >= maxLen - 1) {
        clearInterval(animTimerRef.current);
        animTimerRef.current = null;
      }
    }, 500);
  }, [clickedNodeId, data.edges, getFullPathsThroughNode]);

  const clearSelection = useCallback(() => {
    setClickedNodeId(null);
    setActivePaths([]);
    setVisibleHops(new Set());
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, []);

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .react-flow__node-laneNode {
          pointer-events: none !important;
          cursor: default !important;
        }
        .react-flow__node-laneNode:hover {
          box-shadow: none !important;
        }
        .react-flow__node-laneNode.selected {
          box-shadow: none !important;
        }
        .react-flow__node-attackNode {
          border-radius: 50% !important;
          overflow: visible !important;
        }
        .react-flow__edge-path {
          stroke-width: 2;
        }
        .react-flow__arrowhead {
          fill: currentColor;
        }
      `}</style>

      {/* LEGEND */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 16,
        padding: '8px 14px', marginBottom: 8,
        border: '0.5px solid #e2e8f0',
        borderRadius: 8, alignItems: 'center', fontSize: 11,
        background: '#f8fafc',
      }}>
        {PHASES.map(p => (
          <div key={p.key}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: p.color, flexShrink: 0,
            }}/>
            <span style={{ color: '#64748b' }}>
              {p.label}
            </span>
          </div>
        ))}
        <div style={{
          borderLeft: '0.5px solid #cbd5e1',
          paddingLeft: 16,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {[[18,'1 agent'],[30,'3 agents'],[46,'5+ agents']].map(
            ([sz, lbl]) => (
            <div key={lbl}
              style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{
                width: sz * 0.6, height: sz * 0.6,
                borderRadius: '50%',
                background: '#94a3b8',
              }}/>
              <span style={{ color:'#64748b', fontSize: 10 }}>
                {lbl}
              </span>
            </div>
          ))}
        </div>
        <div style={{
          borderLeft: '0.5px solid #cbd5e1',
          paddingLeft: 16, color: '#64748b',
        }}>
          Animated edges = 2+ agents · Click node to trace paths
        </div>
      </div>

      {/* PATH INFO BAR */}
      {clickedNodeId && (() => {
        const n = data.nodes.find(n => n.node_id === clickedNodeId);
        const phase = n ? getPhase(n.kill_chain_phase) : null;
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 14px', marginBottom: 8,
            background: '#f8fafc',
            borderRadius: 8, fontSize: 12,
            border: '0.5px solid #e2e8f0',
            flexWrap: 'wrap',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: phase?.color, flexShrink: 0,
            }}/>
            <span style={{ fontWeight: 500, color: '#1e293b' }}>
              {n?.technique_id} — {n?.technique_name}
            </span>
            <span style={{ color: '#64748b' }}>
              {activePaths.length} attack path
              {activePaths.length !== 1 ? 's' : ''} through this node
            </span>
            <span style={{ color: '#cbd5e1' }}>·</span>
            <span style={{ color: '#64748b' }}>
              {new Set(activePaths.flat()).size} nodes involved
            </span>
            <button onClick={clearSelection} style={{
              marginLeft: 'auto', fontSize: 11, cursor: 'pointer',
              border: '0.5px solid #cbd5e1',
              borderRadius: 6, padding: '2px 10px',
              background: 'transparent',
              color: '#64748b',
            }}>
              Clear ✕
            </button>
          </div>
        );
      })()}

      {/* REACT FLOW CONTAINER */}
      <div style={{
        width: '100%',
        height: PHASES.length * LANE_HEIGHT + 80,
        minHeight: 600,
      }}>
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={clearSelection}
          fitView
          fitViewOptions={{
            padding: 0.12,
            includeHiddenNodes: false,
          }}
          minZoom={0.2}
          maxZoom={3}
          style={{ background: 'transparent' }}
          defaultEdgeOptions={{
            type: 'default',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
          }}
          connectionLineType="bezier"
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          panOnDrag={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          preventScrolling={true}
        >
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={n => n.data?.phase?.color ?? '#888'}
            nodeStrokeWidth={2}
            zoomable
            pannable
            style={{ bottom: 16, right: 16 }}
          />
          <Background
            variant="dots"
            gap={32}
            size={1}
            color="#e2e8f0"
          />
        </ReactFlow>
      </div>

      {/* COVERAGE GAPS */}
      {coverageGaps?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8,
                        color: '#64748b' }}>
            Coverage gaps — no paths discovered ({coverageGaps.length} assets)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {coverageGaps.map((id, i) => (
              <div key={i} style={{
                border: '1px dashed #cbd5e1',
                borderRadius: 6, padding: '4px 10px',
                fontSize: 11,
                color: '#64748b',
                background: '#f8fafc',
              }}>
                {id}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NO EDGES NOTE */}
      {data.edges?.length === 0 && data.nodes?.length > 0 && (
        <div style={{
          marginTop: 16,
          padding: '10px 14px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: 6,
          fontSize: 12,
          color: '#92400e',
        }}>
          <strong>Note:</strong> No technique chains identified — showing nodes only
        </div>
      )}
    </div>
  );
}
