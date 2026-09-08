export function isPresent(value: unknown): value is string | number {
  return value !== null && value !== undefined && value !== '';
}

export function formatUsd(value: number | string | null | undefined, compact = true) {
  if (!isPresent(value)) return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const absolute = Math.abs(number);
  const maximumFractionDigits = absolute < 1 ? 4 : absolute < 1_000 ? 2 : 1;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact && absolute >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits,
  }).format(number);
}

export function formatNumber(
  value: number | string | null | undefined,
  options: Intl.NumberFormatOptions = {},
) {
  if (!isPresent(value)) return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    ...options,
  }).format(number);
}

export function formatPercent(value: number | string | null | undefined) {
  if (!isPresent(value)) return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number >= 0 ? '+' : ''}${number.toFixed(Math.abs(number) < 1 ? 2 : 1)}%`;
}

export function formatFee(value: number | null | undefined) {
  if (!isPresent(value)) return '—';
  return `${(Number(value) / 10_000).toLocaleString('en-US', {
    maximumFractionDigits: 3,
  })}%`;
}

export function shortHash(value: string | null | undefined, head = 6, tail = 4) {
  if (!value) return '—';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function displayText(value: unknown, fallback = '—') {
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function timestampMs(value: number | string | null | undefined) {
  if (!isPresent(value)) return null;
  if (typeof value === 'number') {
    if (value < 100_000_000_000) return value * 1000;
    if (value < 100_000_000_000_000) return value;
    return value / 1000;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatTime(value: number | string | null | undefined) {
  const millis = timestampMs(value);
  if (millis == null) return '—';
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date);
}

export function formatDateTime(value: number | string | null | undefined) {
  const millis = timestampMs(value);
  if (millis == null) return '—';
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date);
}

export function age(value: number | string | null | undefined) {
  const millis = timestampMs(value);
  if (millis == null) return '—';
  const seconds = Math.max(0, Math.floor((Date.now() - millis) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

export function pairLabel(row: {
  pair?: string | null;
  token0?: { symbol?: string | null; address?: string | null } | string | null;
  token1?: { symbol?: string | null; address?: string | null } | string | null;
  id?: string | number | null;
}) {
  if (row.pair) return row.pair.replace('/', ' / ');
  const token = (value: typeof row.token0) => {
    if (typeof value === 'string') return shortHash(value);
    return value?.symbol || shortHash(value?.address);
  };
  if (row.token0 || row.token1) return `${token(row.token0)} / ${token(row.token1)}`;
  return shortHash(row.id == null ? null : String(row.id));
}
