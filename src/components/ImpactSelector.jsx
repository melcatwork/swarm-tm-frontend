/**
 * ImpactSelector Component
 *
 * Allows users to select CSA CII data classification (impact) level (1-5)
 * before running threat models. Shows descriptive text and examples
 * for each impact level.
 */

const IMPACT_OPTIONS = [
  {
    value: 1,
    label: 'Negligible',
    description:
      'Public or non-sensitive data. Disclosure, modification, '
      + 'or disruption has negligible effect on the organisation '
      + 'or individuals.',
    examples: 'Public website content, marketing materials',
  },
  {
    value: 2,
    label: 'Minor',
    description:
      'Official or general business data. Unauthorised access '
      + 'would have a limited adverse effect on the organisation '
      + 'or individuals.',
    examples: 'Internal reports, general correspondence',
  },
  {
    value: 3,
    label: 'Moderate',
    description:
      'Internal, restricted, or business-sensitive data. '
      + 'Unauthorised access would have some adverse effect on '
      + 'the organisation, individuals, or the nation.',
    examples: 'Business strategy, vendor contracts, HR data',
  },
  {
    value: 4,
    label: 'Severe',
    description:
      'Confidential data including PII, financial records, or '
      + 'health records. Unauthorised access would have a serious '
      + 'adverse effect on the organisation, individuals, or '
      + 'the nation.',
    examples:
      'Customer PII, payment data, medical records, credentials',
  },
  {
    value: 5,
    label: 'Very Severe',
    description:
      'Top Secret, highly classified, or national security data. '
      + 'Unauthorised access would have an exceptionally grave '
      + 'adverse effect on the organisation, individuals, or '
      + 'the nation.',
    examples:
      'National security data, critical infrastructure controls',
  },
]

const BAND_COLOURS = {
  1: '#FFEB3B',
  2: '#F4A460',
  3: '#FF8C00',
  4: '#B71C1C',
  5: '#F44336',
}

export default function ImpactSelector({ value, onChange }) {
  const selected = IMPACT_OPTIONS.find(o => o.value === value)
    || IMPACT_OPTIONS[2]

  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: 'block',
          fontWeight: 600,
          fontSize: 13,
          marginBottom: 6,
          color: 'var(--color-text-primary)',
        }}
      >
        Data classification (impact)
        <span
          style={{
            fontWeight: 400,
            color: 'var(--color-text-secondary)',
            marginLeft: 6,
          }}
        >
          — CSA CII framework, Section 4.2
        </span>
      </label>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {IMPACT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 6,
              border: value === opt.value
                ? `2px solid ${BAND_COLOURS[opt.value]}`
                : '2px solid var(--color-border-tertiary)',
              backgroundColor: value === opt.value
                ? `${BAND_COLOURS[opt.value]}18`
                : 'var(--color-background-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: BAND_COLOURS[opt.value],
              }}
            >
              {opt.value}
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: value === opt.value
                  ? BAND_COLOURS[opt.value]
                  : 'var(--color-text-secondary)',
                marginTop: 2,
              }}
            >
              {opt.label}
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          padding: '10px 14px',
          borderRadius: 6,
          border: `1px solid ${BAND_COLOURS[selected.value]}40`,
          backgroundColor:
            `${BAND_COLOURS[selected.value]}0a`,
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            color: BAND_COLOURS[selected.value],
            marginBottom: 3,
          }}
        >
          {selected.value} — {selected.label}
        </div>
        <div
          style={{
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
            marginBottom: 4,
          }}
        >
          {selected.description}
        </div>
        <div
          style={{
            color: 'var(--color-text-tertiary)',
            fontStyle: 'italic',
          }}
        >
          Examples: {selected.examples}
        </div>
      </div>
    </div>
  )
}
