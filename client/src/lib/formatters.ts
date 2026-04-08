/** Format a dollar amount as AUD currency string */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

/** Format weight in kg with 3 decimal places */
export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return `${kg.toFixed(3)} kg`;
}

/** Format cubic metres with 4 decimal places */
export function formatCubic(m3: number | null | undefined): string {
  if (m3 == null) return '—';
  return `${m3.toFixed(4)} m³`;
}

/** Format an ISO date string as DD/MM/YYYY */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format an ISO datetime as DD/MM/YYYY HH:mm */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-AU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Compute cubic metres from centimetre dimensions */
export function computeCubicM3(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  quantity = 1,
): number {
  return parseFloat(((lengthCm * widthCm * heightCm * quantity) / 1_000_000).toFixed(6));
}

/** Compute DIM weight: cubicM3 × dimFactor (default 250 kg/m³) */
export function computeDimWeight(cubicM3: number, dimFactor = 250): number {
  return parseFloat((cubicM3 * dimFactor).toFixed(3));
}
