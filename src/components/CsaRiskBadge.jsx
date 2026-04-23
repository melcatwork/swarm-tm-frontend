/**
 * CsaRiskBadge Component
 *
 * Reusable badge component for displaying CSA CII risk bands
 * with color-coded indicators according to the 5×5 risk matrix.
 */

const BAND_STYLES = {
  'Low': {
    bg: '#FFEB3B',
    text: '#000',
    label: 'Low',
  },
  'Medium': {
    bg: '#F4A460',
    text: '#000',
    label: 'Medium',
  },
  'Medium-High': {
    bg: '#FF8C00',
    text: '#fff',
    label: 'Medium-High',
  },
  'High': {
    bg: '#B71C1C',
    text: '#fff',
    label: 'High',
  },
  'Very High': {
    bg: '#F44336',
    text: '#fff',
    label: 'Very High',
  },
}

const DEFAULT_STYLE = {
  bg: '#888',
  text: '#fff',
  label: 'Unknown',
}

export default function CsaRiskBadge({
  band,
  score,
  size = 'md',
}) {
  const style = BAND_STYLES[band] || DEFAULT_STYLE

  const padding = size === 'lg'
    ? '6px 14px'
    : size === 'sm'
    ? '2px 8px'
    : '4px 10px'

  const fontSize = size === 'lg'
    ? '14px'
    : size === 'sm'
    ? '11px'
    : '12px'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          backgroundColor: style.bg,
          color: style.text,
          padding,
          borderRadius: 4,
          fontWeight: 600,
          fontSize,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}
      >
        {style.label}
      </span>
      {score !== undefined && score !== null && (
        <span
          style={{
            color: style.bg,
            fontWeight: 700,
            fontSize,
          }}
        >
          {score} / 25
        </span>
      )}
    </div>
  )
}
