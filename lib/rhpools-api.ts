export const API_ORIGIN =
  process.env.NEXT_PUBLIC_RHPOOLS_API_ORIGIN?.replace(/\/$/, '') ||
  'https://rhpools.lol';

export type WindowKey = '1h' | '24h' | '7d' | '30d' | 'all';
export type ProtocolKey = '' | 'v2' | 'v3' | 'v4';

export type Coverage = {
  window?: string;
  requested_from?: number | null;
  from?: number | null;
  to?: number | null;
  observed_s?: number | null;
  complete?: boolean;
  basis?: string | null;
  pricing_basis?: string | null;
  priced_swaps?: number | null;
  unpriced_swaps?: number | null;
  priced_flows?: number | null;
  unpriced_flows?: number | null;
  [key: string]: unknown;
};

export type Status = {
  chain_id?: number | null;
  state?: string | null;
  as_of?: number | null;
  head?: number | null;
  observed_head?: number | null;
  indexed_head?: number | null;
  lag_blocks?: number | null;
  lag_s?: number | null;
  indexed_events?: number | null;
  indexed_pools?: number | null;
  backfill?: boolean;
  pricing_basis?: string | null;
  fees_basis?: string | null;
  errors?: Record<string, string> | null;
  coverage?: Record<string, unknown> | null;
};

export type Overview = {
  window?: string;
  volume_usd?: number | null;
  fees_usd?: number | null;
  swaps?: number | null;
  adds?: number | null;
  removes?: number | null;
  collects?: number | null;
  active_pools?: number | null;
  active_owners?: number | null;
  net_deposits_usd?: number | null;
  coverage?: Coverage;
  status?: Status;
};

export type Token = {
  address?: string | null;
  symbol?: string | null;
  decimals?: number | null;
  metadata_state?: string | null;
};

export type PoolRow = {
  id?: string | null;
  address?: string | null;
  pair?: string | null;
  protocol?: string | null;
  kind?: string | null;
  token0?: Token | string | null;
  token1?: Token | string | null;
  fee_ppm?: number | null;
  tvl_usd?: number | null;
  active_tvl_usd?: number | null;
  volume_usd?: number | null;
  volume_1h_usd?: number | null;
  fees_usd?: number | null;
  fees_1h_usd?: number | null;
  swaps?: number | null;
  swaps_1h?: number | null;
  adds?: number | null;
  removes?: number | null;
  lp_count?: number | null;
  price?: number | null;
  price_change_pct?: number | null;
  risks?: string[] | null;
  coverage?: Record<string, unknown> | null;
  last_swap_at?: number | null;
  tick_spacing?: number | null;
  state?: string | null;
};

export type TapeRow = {
  id?: number | string | null;
  timestamp?: number | null;
  block_number?: number | null;
  pair?: string | null;
  protocol?: string | null;
  kind?: string | null;
  owner?: string | null;
  custody?: string | null;
  pool_id?: string | null;
  tx_hash?: string | null;
  size_usd?: number | null;
  volume_usd?: number | null;
  fees_usd?: number | null;
  deposit_usd?: number | null;
  withdrawal_usd?: number | null;
  tick_lower?: number | null;
  tick_upper?: number | null;
  accounting_basis?: string | null;
  identity_basis?: string | null;
  token0?: Token | string | null;
  token1?: Token | string | null;
};

export type OwnerRow = {
  owner?: string | null;
  custody?: string | null;
  identity_basis?: string | null;
  positions?: number | null;
  open_positions?: number | null;
  gross_pnl_usd?: number | null;
  net_pnl_usd?: number | null;
  gas_usd?: number | null;
  fees_usd?: number | null;
  volume_usd?: number | null;
  win_rate?: number | null;
  activity?: {
    timestamp?: number | null;
    pair?: string | null;
    kind?: string | null;
    tx_hash?: string | null;
    event_count?: number | null;
  } | null;
  coverage?: {
    qualified?: boolean;
    cost_qualified?: boolean;
    reasons?: string[];
    [key: string]: unknown;
  } | null;
  financials?: Record<string, unknown> | null;
};

export type ListResponse<T> = {
  rows: T[];
  total?: number | null;
  coverage?: Coverage | Record<string, unknown> | null;
  as_of?: number | null;
  revision?: number | null;
  epoch?: number | null;
  [key: string]: unknown;
};

export type WorkbenchDetail = {
  pool?: PoolRow;
  block?: number | null;
  block_hash?: string | null;
  block_timestamp?: number | null;
  as_of?: number | null;
  freshness?: Record<string, unknown> | null;
  health?: {
    state?: string | null;
    error?: string | null;
    reorgs?: number | null;
    refresh_failures?: number | null;
    reconnects?: number | null;
  } | null;
  coverage?: {
    swaps_1m?: {
      complete?: boolean;
      qualification?: string | null;
      observed_current_swaps?: number | null;
    } | null;
    positions?: {
      supported?: boolean;
      complete?: boolean;
      ranges_truncated?: boolean;
      error?: string | null;
    } | null;
    lp_events?: {
      supported?: boolean;
      state?: string | null;
      lifecycle_history_complete?: boolean;
      error?: string | null;
    } | null;
    curve?: {
      state?: string | null;
      complete_through_snapshot?: boolean;
    } | null;
    [key: string]: unknown;
  } | null;
  spot?: {
    price_token1_per_token0?: number | null;
    price_usd?: number | null;
    source?: string | null;
    sqrt_price_x96?: string | null;
    tick?: number | null;
  } | null;
  liquidity?: {
    active?: string | number | null;
    curve?: Array<Record<string, unknown>> | null;
    curve_block?: number | null;
    curve_complete?: boolean;
    model?: string | null;
  } | null;
  lp?: {
    our_active_liquidity?: string | number | null;
    active_share_pct?: number | null;
    amount0?: string | number | null;
    amount1?: string | number | null;
    value_usd?: number | null;
    in_range?: number | null;
    position_count?: number | null;
    swaps_1m?: number | null;
    volume_1m_usd?: number | null;
    pool_fees_1m_usd?: number | null;
    our_fees_1m_usd?: number | null;
  } | null;
  tracking?: Array<{
    block?: number | null;
    timestamp?: number | null;
    price_token1_per_token0?: number | null;
    active_liquidity?: string | number | null;
  }>;
  positions?: Array<Record<string, unknown>>;
  swaps?: Array<Record<string, unknown>>;
  participants?: Array<Record<string, unknown>>;
  lp_events?: Array<Record<string, unknown>>;
  capabilities?: Record<string, unknown> | null;
};

export type ResearchPool = {
  pool_id?: string | null;
  pair?: string | null;
  protocol?: string | null;
  position_count?: number | null;
  valued_positions?: number | null;
  partially_valued_positions?: number | null;
  unvalued_positions?: number | null;
  known_principal_usdg?: number | null;
  share_of_known_principal_pct?: number | null;
};

export type ResearchPosition = {
  position_key?: string | null;
  pool_id?: string | null;
  pair?: string | null;
  protocol?: string | null;
  status?: string | null;
  range?: {
    tick_lower?: number | null;
    tick_upper?: number | null;
    in_range?: boolean | null;
    width_ticks?: number | null;
  } | null;
  fee?: {
    mode?: string | null;
    current_ppm?: string | number | null;
  } | null;
};

export type ResearchLifecycle = {
  kind?: string | null;
  timestamp?: number | null;
  position_key?: string | null;
  pool_id?: string | null;
  pair?: string | null;
};

export type ResearchResponse = {
  owner: string;
  window: string;
  coverage: {
    found?: boolean;
    state?: string | null;
    indexed_head?: number | null;
    window_complete?: boolean;
    returned_positions?: number | null;
    positions_omitted_by_research_limit?: number | null;
    possible_position_truncation?: boolean;
    identity?: {
      basis?: string | null;
      beneficial_owner_observed?: boolean;
      custody_observed?: boolean;
    } | null;
    valuation?: {
      complete_for_returned_current_positions?: boolean;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  };
  allocation: {
    known_principal_usdg?: number | null;
    known_pending_claim_usdg?: number | null;
    current_beneficial_positions?: number | null;
    custody_positions_observed?: number | null;
    valued_positions?: number | null;
    pools?: ResearchPool[];
    positions?: ResearchPosition[];
    [key: string]: unknown;
  };
  configurations: {
    positions?: ResearchPosition[];
    protocol_mix?: Array<{
      protocol?: string | null;
      returned_positions?: number | null;
      position_count?: number | null;
    }>;
    fee_mode_mix?: Array<{
      mode?: string | null;
      returned_positions?: number | null;
      position_count?: number | null;
    }>;
    range_width_ticks?: {
      minimum?: number | null;
      median?: number | null;
      maximum?: number | null;
    } | null;
    [key: string]: unknown;
  };
  activity: {
    recent_lifecycle?: ResearchLifecycle[];
    [key: string]: unknown;
  };
  limitations: string[];
};

export type FlowItem = {
  publisher?: string | null;
  canonical_action_id?: string | null;
  source_event_id?: string | null;
  identity?: {
    kind?: string | null;
    handle?: string | null;
    wallet?: string | null;
  } | null;
  source?: {
    kind?: string | null;
    transaction_hash?: string | null;
    block_number_or_slot?: string | null;
  } | null;
  asset?: {
    chain?: string | null;
    address?: string | null;
    symbol?: string | null;
    name?: string | null;
  } | null;
  action?: string | null;
  action_basis?: string | null;
  economics?: {
    trade_size_usd?: string | number | null;
    leader_fill_price_usd?: string | number | null;
    trade_quantity?: string | number | null;
    value_basis?: string | null;
  } | null;
  evidence?: {
    occurred_at?: string | null;
    observed_at?: string | null;
  } | null;
};

export type FlowResponse = {
  schema_version?: string;
  query?: {
    source?: string | null;
    chain?: string | null;
    verified_only?: boolean;
  } | null;
  evidence_through?: string | null;
  next_cursor?: string | null;
  coverage?: {
    returned_items?: number | null;
    upstream_page_items?: number | null;
    identity_scope?: string | null;
    cursor_scope?: string | null;
    rows_omitted?: Record<string, number> | null;
    pool_attribution?: { reason?: string | null } | null;
    [key: string]: unknown;
  } | null;
  provenance?: {
    publisher?: string | null;
    access?: string | null;
    evidence_time_basis?: string | null;
    [key: string]: unknown;
  } | null;
  items?: FlowItem[];
};

export class ApiError extends Error {
  status: number;
  retryAfterSeconds: number | null;

  constructor(
    message: string,
    status: number,
    retryAfterSeconds: number | null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type QueryValue = string | number | boolean | null | undefined;

function queryString(params: Record<string, QueryValue>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }
  const value = query.toString();
  return value ? `?${value}` : '';
}

function parseRetryAfter(value: string | null) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, (date - Date.now()) / 1000) : null;
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer);
        reject(new DOMException('Request cancelled', 'AbortError'));
      },
      { once: true },
    );
  });
}

let retryCooldownUntil = 0;

export async function getJson<T>(
  path: string,
  params: Record<string, QueryValue> = {},
  options: { signal?: AbortSignal; timeoutMs?: number; retry?: boolean } = {},
): Promise<T> {
  const timeout = new AbortController();
  const timeoutId = window.setTimeout(
    () => timeout.abort(),
    options.timeoutMs ?? 12_000,
  );
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout.signal])
    : timeout.signal;

  try {
    for (
      let attempt = 0;
      attempt < (options.retry === false ? 1 : 2);
      attempt += 1
    ) {
      const sharedDelay = retryCooldownUntil - Date.now();
      if (sharedDelay > 0) await wait(sharedDelay, signal);
      const response = await fetch(
        `${API_ORIGIN}${path}${queryString(params)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal,
        },
      );

      if (response.ok) return (await response.json()) as T;

      const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
      let detail = '';
      try {
        const body = (await response.json()) as unknown;
        if (body && typeof body === 'object' && !Array.isArray(body)) {
          const problem = body as Record<string, unknown>;
          const nestedError = problem.error;
          if (
            nestedError &&
            typeof nestedError === 'object' &&
            !Array.isArray(nestedError)
          ) {
            const message = (nestedError as Record<string, unknown>).message;
            if (typeof message === 'string') detail = message;
          } else if (typeof nestedError === 'string') detail = nestedError;
          if (!detail && typeof problem.detail === 'string')
            detail = problem.detail;
          if (!detail && typeof problem.message === 'string')
            detail = problem.message;
        }
      } catch {
        detail = '';
      }
      const message = detail || `数据接口返回 HTTP ${response.status}`;
      const canRetry =
        attempt === 0 &&
        (response.status === 429 || response.status === 503) &&
        (retryAfter == null || retryAfter <= 5);
      if (!canRetry) throw new ApiError(message, response.status, retryAfter);
      const delay =
        Math.max(750, (retryAfter ?? 1) * 1000) +
        Math.round(Math.random() * 350);
      retryCooldownUntil = Math.max(retryCooldownUntil, Date.now() + delay);
      await wait(retryCooldownUntil - Date.now(), signal);
    }
    throw new Error('请求未完成');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (options.signal?.aborted) throw error;
      throw new Error('数据接口响应超时');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  status: (signal?: AbortSignal) =>
    getJson<Status>('/api/lp/status', {}, { signal }),
  overview: (windowKey: WindowKey, signal?: AbortSignal) =>
    getJson<Overview>('/api/lp/overview', { window: windowKey }, { signal }),
  pools: (
    params: {
      window: WindowKey;
      q?: string;
      protocol?: ProtocolKey;
      sort?: string;
      order?: string;
      limit?: number;
      offset?: number;
    },
    signal?: AbortSignal,
  ) => getJson<ListResponse<PoolRow>>('/api/lp/pools', params, { signal }),
  tape: (
    params: {
      window: WindowKey;
      q?: string;
      protocol?: ProtocolKey;
      kind?: string;
      limit?: number;
      offset?: number;
    },
    signal?: AbortSignal,
  ) => getJson<ListResponse<TapeRow>>('/api/lp/tape', params, { signal }),
  owners: (
    params: {
      window: WindowKey;
      q?: string;
      protocol?: ProtocolKey;
      limit?: number;
      offset?: number;
    },
    signal?: AbortSignal,
  ) => getJson<ListResponse<OwnerRow>>('/api/lp/owners', params, { signal }),
  workbenchPools: (
    params: {
      q?: string;
      kind?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    },
    signal?: AbortSignal,
  ) =>
    getJson<ListResponse<PoolRow>>('/api/workbench/pools', params, { signal }),
  workbenchPool: (id: string, owner?: string, signal?: AbortSignal) =>
    getJson<WorkbenchDetail>('/api/workbench/pool', { id, owner }, { signal }),
  researchOwner: (owner: string, windowKey: WindowKey, signal?: AbortSignal) =>
    getJson<ResearchResponse>(
      '/api/v1/research/owner',
      { owner, window: windowKey },
      { signal, timeoutMs: 25_000 },
    ),
  flow: (
    params: {
      source: 'apollo' | 'rhtrenches';
      chain?: '' | 'solana' | 'base' | 'robinhood';
      verified?: boolean;
      limit?: number;
      cursor?: string;
    },
    signal?: AbortSignal,
  ) =>
    getJson<FlowResponse>('/api/v1/fomo/flow', params, {
      signal,
      timeoutMs: 20_000,
    }),
};

export function describeError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 429 || error.status === 503) {
      const suffix =
        error.retryAfterSeconds == null
          ? ''
          : `，建议 ${Math.ceil(error.retryAfterSeconds)} 秒后重试`;
      return `数据源当前繁忙${suffix}`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return '数据暂时不可用';
}
