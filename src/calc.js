import { MID, FINAL, LEC_WEIGHT } from './config';

const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v);
const round4 = (x) => Math.round(x * 1e4) / 1e4;

export const keyOf = (r) =>
  [r.dept, r.ay, r.sem, r.type, r.code, r.batch].map((x) => String(x ?? '').trim().toLowerCase()).join('|');

// Adds the calculated fields to one record (same rules as the Excel workbook).
export function calc(r) {
  const k = num(r.total), l = num(r.covered);
  const lec = k > 0 && l != null ? Math.min(l / k, 1) : null;
  const hasLab = r.lab === 'Yes';
  const p = num(r.labTotal), q = num(r.labCovered);
  const lab = hasLab && p > 0 && q != null ? Math.min(q / p, 1) : null;
  const perf = lec == null ? null : round4(lab == null ? lec : lec * LEC_WEIGHT + lab * (1 - LEC_WEIGHT));
  const bands = r.type === 'Final' ? FINAL : MID;
  const status = perf == null ? '' : [...bands].reverse().find((b) => perf >= b[0] - 1e-9)[1];
  return {
    ...r,
    remaining: k != null && l != null ? k - l : null,
    labRemaining: hasLab && p != null && q != null ? p - q : null,
    lec, labPct: lab, perf, status,
  };
}

export const avg = (arr) => {
  const v = arr.filter((x) => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
export const pct = (v) => (v == null ? '–' : (v * 100).toFixed(1) + '%');
