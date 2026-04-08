import { computeCubicM3, computeDimWeight } from '@/lib/formatters';

export interface LineItemRow {
  id: string;
  description: string;
  quantity: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  packagingType: string;
}

interface Props {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
}

const PACKAGING_TYPES = ['carton', 'pallet', 'crate', 'drum', 'roll', 'bag', 'other'];

function emptyRow(): LineItemRow {
  return { id: crypto.randomUUID(), description: '', quantity: 1, lengthCm: 0, widthCm: 0, heightCm: 0, weightKg: 0, packagingType: 'carton' };
}

export default function ConnoteLineItemsTable({ items, onChange }: Props) {
  function add() { onChange([...items, emptyRow()]); }

  function update<K extends keyof LineItemRow>(index: number, field: K, value: LineItemRow[K]) {
    onChange(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function remove(index: number) { onChange(items.filter((_, i) => i !== index)); }

  const totals = items.reduce(
    (acc, item) => {
      const cubic = computeCubicM3(item.lengthCm, item.widthCm, item.heightCm, item.quantity);
      return {
        weightKg: acc.weightKg + item.weightKg * item.quantity,
        cubicM3: acc.cubicM3 + cubic,
        items: acc.items + item.quantity,
      };
    },
    { weightKg: 0, cubicM3: 0, items: 0 },
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Line Items</label>
        <button type="button" onClick={add} style={addBtnStyle}>+ Add Item</button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f9fafb' }}>
            <tr>
              {['Type', 'Description', 'Qty', 'L (cm)', 'W (cm)', 'H (cm)', 'Wt/item (kg)', 'Cubic (m³)', 'DIM Wt', ''].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
                  No items yet. Click "+ Add Item".
                </td>
              </tr>
            ) : (
              items.map((item, i) => {
                const cubic = computeCubicM3(item.lengthCm, item.widthCm, item.heightCm, item.quantity);
                const dimWt = computeDimWeight(cubic);
                return (
                  <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={tdStyle}>
                      <select
                        value={item.packagingType}
                        onChange={(e) => update(i, 'packagingType', e.target.value)}
                        style={cellInputStyle}
                      >
                        {PACKAGING_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input
                        value={item.description}
                        onChange={(e) => update(i, 'description', e.target.value)}
                        style={{ ...cellInputStyle, minWidth: 140 }}
                        placeholder="Item description"
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => update(i, 'quantity', parseInt(e.target.value) || 1)}
                        style={{ ...cellInputStyle, width: 60 }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" min="0" step="0.1" value={item.lengthCm || ''} onChange={(e) => update(i, 'lengthCm', parseFloat(e.target.value) || 0)} style={{ ...cellInputStyle, width: 70 }} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" min="0" step="0.1" value={item.widthCm || ''} onChange={(e) => update(i, 'widthCm', parseFloat(e.target.value) || 0)} style={{ ...cellInputStyle, width: 70 }} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" min="0" step="0.1" value={item.heightCm || ''} onChange={(e) => update(i, 'heightCm', parseFloat(e.target.value) || 0)} style={{ ...cellInputStyle, width: 70 }} />
                    </td>
                    <td style={tdStyle}>
                      <input type="number" min="0" step="0.001" value={item.weightKg || ''} onChange={(e) => update(i, 'weightKg', parseFloat(e.target.value) || 0)} style={{ ...cellInputStyle, width: 80 }} />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{cubic > 0 ? cubic.toFixed(4) : '—'}</td>
                    <td style={{ ...tdStyle, color: dimWt > item.weightKg * item.quantity ? '#d97706' : '#374151', fontWeight: 600 }}>
                      {dimWt > 0 ? dimWt.toFixed(3) : '—'}
                    </td>
                    <td style={tdStyle}>
                      <button type="button" onClick={() => remove(i)} style={removeBtnStyle}>✕</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb', fontWeight: 700 }}>
              <tr>
                <td colSpan={2} style={{ padding: '8px 12px', fontSize: 12, color: '#374151' }}>TOTALS ({totals.items} items)</td>
                <td />
                <td colSpan={3} />
                <td style={{ padding: '8px 12px' }}>{totals.weightKg.toFixed(3)} kg</td>
                <td style={{ padding: '8px 12px' }}>{totals.cubicM3.toFixed(4)} m³</td>
                <td style={{ padding: '8px 12px' }}>{computeDimWeight(totals.cubicM3).toFixed(3)} kg</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

const addBtnStyle: React.CSSProperties = { padding: '3px 10px', fontSize: 12, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 4, cursor: 'pointer', fontWeight: 600 };
const removeBtnStyle: React.CSSProperties = { width: 26, height: 26, borderRadius: 4, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.3, whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '6px 8px', verticalAlign: 'middle' };
const cellInputStyle: React.CSSProperties = { padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, outline: 'none', width: '100%' };
