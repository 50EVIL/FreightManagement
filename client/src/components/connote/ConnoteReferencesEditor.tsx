import type { ConnoteReference } from '@/types/connote';
import { REFERENCE_TYPES } from '@/types/connote';

interface Props {
  references: ConnoteReference[];
  onChange: (refs: ConnoteReference[]) => void;
}

export default function ConnoteReferencesEditor({ references, onChange }: Props) {
  function add() {
    onChange([...references, { type: 'order_number', value: '' }]);
  }

  function update(index: number, field: keyof ConnoteReference, value: string) {
    const updated = references.map((r, i) => i === index ? { ...r, [field]: value } : r);
    onChange(updated);
  }

  function remove(index: number) {
    onChange(references.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>References (unlimited)</label>
        <button type="button" onClick={add} style={addBtnStyle}>+ Add Reference</button>
      </div>

      {references.length === 0 && (
        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: 6, border: '1px dashed #d1d5db', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
          No references yet. Add order numbers, PO numbers, etc.
        </div>
      )}

      {references.map((ref, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <select
            value={ref.type}
            onChange={(e) => update(i, 'type', e.target.value)}
            style={{ ...selectStyle, minWidth: 160 }}
          >
            {REFERENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
            <option value="other">Other</option>
          </select>
          <input
            value={ref.value}
            onChange={(e) => update(i, 'value', e.target.value)}
            placeholder={ref.type === 'order_number' ? 'ORD-001234' : 'Reference value'}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button type="button" onClick={() => remove(i)} style={removeBtnStyle} title="Remove">✕</button>
        </div>
      ))}
    </div>
  );
}

const addBtnStyle: React.CSSProperties = {
  padding: '3px 10px', fontSize: 12, background: '#eff6ff', border: '1px solid #bfdbfe',
  color: '#1d4ed8', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
};
const removeBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 4, border: '1px solid #fecaca',
  background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 14, flexShrink: 0,
};
const selectStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none',
};
const inputStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none',
};
