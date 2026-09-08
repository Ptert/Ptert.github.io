'use client';

/* oxlint-disable react/react-compiler next/no-html-link-for-pages */

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Blocks,
  CircleDollarSign,
  Coins,
  ExternalLink,
  Gauge,
  Layers3,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  WalletCards,
  Waves,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppShell, EmptyState, PageIntro, Panel } from '@/components/app-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  age,
  formatFee,
  formatNumber,
  formatPercent,
  formatUsd,
  pairLabel,
  shortHash,
} from '@/lib/format';
import {
  api,
  describeError,
  type ListResponse,
  type Overview,
  type OwnerRow,
  type PoolRow,
  type ProtocolKey,
  type Status,
  type TapeRow,
  type WindowKey,
} from '@/lib/rhpools-api';
import { cn } from '@/lib/utils';
import { registerMarketViewTool } from '@/lib/webmcp';

const WINDOWS: Array<{ value: WindowKey; label: string }> = [
  { value: '1h', label: '1H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: '全部' },
];

const METRIC_META = [
  {
    key: 'volume_usd',
    label: '已定价成交额',
    icon: Waves,
    format: formatUsd,
    tone: 'violet',
  },
  {
    key: 'fees_usd',
    label: '已定价池手续费估算',
    icon: CircleDollarSign,
    format: formatUsd,
    tone: 'cyan',
  },
  {
    key: 'swaps',
    label: '交换笔数',
    icon: Zap,
    format: formatNumber,
    tone: 'amber',
  },
  {
    key: 'active_pools',
    label: '活跃池',
    icon: Layers3,
    format: formatNumber,
    tone: 'green',
  },
  {
    key: 'active_owners',
    label: '活跃身份（含 custody）',
    icon: Users,
    format: formatNumber,
    tone: 'blue',
  },
] as const;

type DashboardData = {
  overview: Overview | null;
  pools: ListResponse<PoolRow> | null;
  tape: ListResponse<TapeRow> | null;
  owners: ListResponse<OwnerRow> | null;
  status: Status | null;
};

const EMPTY_DATA: DashboardData = {
  overview: null,
  pools: null,
  tape: null,
  owners: null,
  status: null,
};

export function TerminalDashboard({
  activePath = '/',
}: {
  activePath?: string;
}) {
  const [windowKey, setWindowKey] = useState<WindowKey>('24h');
  const [protocol, setProtocol] = useState<ProtocolKey>('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [poolSort, setPoolSort] = useState('volume');
  const [poolOrder, setPoolOrder] = useState<'asc' | 'desc'>('desc');
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const requestRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialWindow = params.get('window') as WindowKey | null;
    const initialProtocol = params.get('protocol') as ProtocolKey | null;
    const initialQuery = params.get('q') || '';
    if (WINDOWS.some((item) => item.value === initialWindow))
      setWindowKey(initialWindow!);
    if (['', 'v2', 'v3', 'v4'].includes(initialProtocol || ''))
      setProtocol(initialProtocol || '');
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setTick((value) => value + 1),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () =>
      registerMarketViewTool({
        setWindow: setWindowKey,
        setProtocol,
        setQuery,
      }),
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (windowKey !== '24h') params.set('window', windowKey);
    if (protocol) params.set('protocol', protocol);
    if (debouncedQuery) params.set('q', debouncedQuery);
    const suffix = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${suffix ? `?${suffix}` : ''}`,
    );
  }, [windowKey, protocol, debouncedQuery]);

  const load = useCallback(
    async (quiet = false) => {
      const request = ++requestRef.current;
      activeControllerRef.current?.abort();
      const controller = new AbortController();
      activeControllerRef.current = controller;
      if (quiet) setRefreshing(true);
      else {
        setLoading(true);
        setError(null);
        setData(EMPTY_DATA);
      }

      const common = {
        window: windowKey,
        q: debouncedQuery,
        protocol,
      };
      const results = await Promise.allSettled([
        api.overview(windowKey, controller.signal),
        api.pools(
          { ...common, sort: poolSort, order: poolOrder, limit: 12, offset: 0 },
          controller.signal,
        ),
        api.tape({ ...common, limit: 12, offset: 0 }, controller.signal),
        api.owners({ ...common, limit: 8, offset: 0 }, controller.signal),
        api.status(controller.signal),
      ]);

      if (request !== requestRef.current || controller.signal.aborted) return;
      const [overview, pools, tape, owners, status] = results;
      const successes = results.filter(
        (result) => result.status === 'fulfilled',
      ).length;
      setData((current) => {
        const next = { ...current };
        if (overview.status === 'fulfilled') {
          next.overview = overview.value;
        }
        if (pools.status === 'fulfilled') {
          next.pools = pools.value;
        }
        if (tape.status === 'fulfilled') {
          next.tape = tape.value;
        }
        if (owners.status === 'fulfilled') {
          next.owners = owners.value;
        }
        if (status.status === 'fulfilled') {
          next.status = status.value;
        } else if (overview.status === 'fulfilled' && overview.value.status) {
          next.status = overview.value.status;
        }
        return next;
      });

      const firstFailure = results.find(
        (result) => result.status === 'rejected',
      );
      setError(
        successes === 0
          ? describeError(
              firstFailure && firstFailure.status === 'rejected'
                ? firstFailure.reason
                : null,
            )
          : firstFailure
            ? '部分数据暂时不可用，当前保留最近一次确认结果。'
            : null,
      );
      if (successes > 0) setLastUpdated(Date.now());
      setLoading(false);
      setRefreshing(false);
      if (activeControllerRef.current === controller)
        activeControllerRef.current = null;
    },
    [windowKey, protocol, debouncedQuery, poolSort, poolOrder],
  );

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    const schedule = (delay = 20_000) => {
      if (stopped) return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (stopped) return;
        if (activeControllerRef.current) {
          schedule();
          return;
        }
        if (!document.hidden && navigator.onLine) await load(true);
        schedule();
      }, delay);
    };

    const resume = () => {
      if (!document.hidden && navigator.onLine && !activeControllerRef.current)
        schedule(0);
    };

    void load(false).finally(() => schedule());
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
      activeControllerRef.current?.abort();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [load]);

  const status = data.status || data.overview?.status || null;
  const coverage = data.overview?.coverage;
  const complete = coverage?.complete === true;
  const state = String(status?.state || 'connecting').toLowerCase();

  const metricCards = useMemo(
    () =>
      METRIC_META.map((metric) => ({
        ...metric,
        value: data.overview?.[metric.key] as number | null | undefined,
      })),
    [data.overview],
  );

  return (
    <AppShell
      activePath={activePath}
      status={{
        state: status?.state,
        indexedHead: status?.indexed_head,
        lagBlocks: status?.lag_blocks,
      }}
    >
      <PageIntro
        eyebrow="Robinhood Chain · LP Observatory"
        title="看清每一笔流动性。"
        description="聚合 Robinhood Chain 上已审阅协议的池、LP 钱包与链上事件。数据直接来自公开 RPC 的本地索引，不依赖交易所行情聚合。"
        actions={
          <>
            <div className="live-chip">
              <span
                className={cn(
                  'status-orb',
                  state === 'live' || state === 'ok' ? 'is-live' : 'is-warn',
                )}
              />
              <span>
                <small>索引状态</small>
                <strong>
                  {state === 'connecting' ? '连接中' : state.toUpperCase()}
                </strong>
              </span>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => void load(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn(refreshing && 'animate-spin')} />
              刷新
            </Button>
          </>
        }
      />

      <section className="status-strip" aria-label="索引状态">
        <div>
          <Blocks />
          <span>网络头</span>
          <strong>
            {(status?.observed_head ?? status?.head)
              ? `#${formatNumber(status?.observed_head ?? status?.head)}`
              : '—'}
          </strong>
        </div>
        <span className="strip-divider" />
        <div>
          <Gauge />
          <span>索引头</span>
          <strong>
            {status?.indexed_head == null
              ? '—'
              : `#${formatNumber(status.indexed_head)}`}
          </strong>
        </div>
        <span className="strip-divider" />
        <div>
          <Activity />
          <span>延迟</span>
          <strong>
            {status?.lag_blocks == null
              ? '—'
              : `${formatNumber(status.lag_blocks)} blocks`}
          </strong>
        </div>
        <span className="strip-divider" />
        <div>
          <span>最近确认</span>
          <strong>
            {lastUpdated == null ? '—' : `${age(lastUpdated)} 前`}
          </strong>
        </div>
        <span className="strip-spacer" />
        <Badge
          variant="outline"
          className={cn(
            'coverage-badge',
            complete ? 'is-complete' : 'is-partial',
          )}
        >
          {complete ? '窗口覆盖完整' : '覆盖仍在回填'}
        </Badge>
      </section>

      {error ? (
        <Alert className="terminal-alert">
          <AlertTriangle />
          <AlertTitle>数据状态提醒</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {data.overview &&
      ((coverage?.unpriced_swaps || 0) > 0 ||
        (coverage?.unpriced_flows || 0) > 0) ? (
        <Alert className="coverage-alert">
          <ShieldAlert />
          <AlertTitle>窗口完整，但估值只覆盖已定价子集</AlertTitle>
          <AlertDescription>
            {formatNumber(coverage?.priced_swaps)} 笔交换已定价，
            {formatNumber(coverage?.unpriced_swaps)} 笔交换未定价；资金流另有{' '}
            {formatNumber(coverage?.unpriced_flows)}{' '}
            笔缺少完整报价。上方金额不是全部事件总额。
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="metrics-grid" aria-label="市场概览">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <article
              className={cn('metric-card', `tone-${metric.tone}`)}
              key={metric.key}
            >
              <header>
                <span className="metric-icon">
                  <Icon />
                </span>
                <span className="metric-window">{windowKey.toUpperCase()}</span>
              </header>
              <p>{metric.label}</p>
              {loading && !data.overview ? (
                <Skeleton className="h-9 w-28 bg-white/10" />
              ) : (
                <strong>{metric.format(metric.value)}</strong>
              )}
              <div className="metric-spark" aria-hidden="true">
                {[25, 48, 33, 61, 42, 78, 58, 88, 68].map((height, bar) => (
                  <i
                    key={bar}
                    style={{
                      height: `${Math.max(14, height - index * 3 + (bar % 2) * 5)}%`,
                    }}
                  />
                ))}
              </div>
            </article>
          );
        })}
        <article className={cn('metric-card', 'tone-flow')}>
          <header>
            <span className="metric-icon">
              <Coins />
            </span>
            <span className="metric-window">净流入</span>
          </header>
          <p>资本流向</p>
          {loading && !data.overview ? (
            <Skeleton className="h-9 w-28 bg-white/10" />
          ) : (
            <strong
              className={cn(
                (data.overview?.net_deposits_usd ?? 0) < 0 && 'is-negative',
              )}
            >
              {formatUsd(data.overview?.net_deposits_usd)}
            </strong>
          )}
          <small>存入 − 提取 · 已定价部分</small>
        </article>
      </section>

      <section className="filter-bar" aria-label="市场筛选">
        <div className="search-field">
          <Search aria-hidden="true" />
          <Input
            aria-label="搜索池、代币或地址"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索交易对、代币、池 ID 或地址"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清除搜索"
            >
              清除
            </button>
          ) : null}
        </div>
        <fieldset className="window-tabs">
          <legend className="sr-only">时间窗口</legend>
          {WINDOWS.map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => setWindowKey(item.value)}
              className={cn(windowKey === item.value && 'is-active')}
              aria-pressed={windowKey === item.value}
            >
              {item.label}
            </button>
          ))}
        </fieldset>
        <NativeSelect
          aria-label="协议筛选"
          value={protocol}
          onChange={(event) => setProtocol(event.target.value as ProtocolKey)}
          className="protocol-select"
        >
          <NativeSelectOption value="">全部协议</NativeSelectOption>
          <NativeSelectOption value="v2">V2</NativeSelectOption>
          <NativeSelectOption value="v3">V3</NativeSelectOption>
          <NativeSelectOption value="v4">V4</NativeSelectOption>
        </NativeSelect>
      </section>

      <div className="terminal-grid">
        <Panel
          className="pools-panel"
          kicker="MARKET CENSUS"
          title="流动性池"
          action={
            <div className="panel-controls">
              <NativeSelect
                aria-label="池排序字段"
                value={poolSort}
                onChange={(event) => setPoolSort(event.target.value)}
                size="sm"
              >
                <NativeSelectOption value="volume">按成交额</NativeSelectOption>
                <NativeSelectOption value="fees">按手续费</NativeSelectOption>
                <NativeSelectOption value="tvl">按 TVL</NativeSelectOption>
                <NativeSelectOption value="swaps">
                  按交换笔数
                </NativeSelectOption>
              </NativeSelect>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  setPoolOrder((value) => (value === 'desc' ? 'asc' : 'desc'))
                }
                title="反转排序"
              >
                {poolOrder === 'desc' ? <ArrowDown /> : <ArrowUp />}
              </Button>
              <Link href="/pool" className="text-link">
                打开分析台 <ArrowRight />
              </Link>
            </div>
          }
        >
          <PoolsTable
            rows={data.pools?.rows || []}
            loading={loading && !data.pools}
          />
          <footer className="panel-footer">
            <span>
              符合条件{' '}
              {data.pools?.total == null ? '—' : formatNumber(data.pools.total)}{' '}
              个池
            </span>
            <span>TVL 对 V4 singleton pool 可能不可用</span>
          </footer>
        </Panel>

        <Panel
          className="feed-panel"
          kicker="20S POLLING"
          title="链上活动"
          action={
            <Badge variant="outline" className="live-badge">
              <span /> 准实时
            </Badge>
          }
        >
          <FeedList
            rows={data.tape?.rows || []}
            loading={loading && !data.tape}
            tick={tick}
          />
          <footer className="panel-footer stacked">
            <span>跨域部署使用轮询，不使用 SSE</span>
            <span>未知金额保持为 “—”</span>
          </footer>
        </Panel>

        <Panel
          className="wallets-panel"
          kicker="IDENTITY-AWARE"
          title="LP 钱包与托管"
          action={
            <Link className="text-link" href="/research">
              研究地址 <ArrowRight />
            </Link>
          }
        >
          <OwnersTable
            rows={data.owners?.rows || []}
            loading={loading && !data.owners}
            tick={tick}
          />
          <footer className="panel-footer">
            <span>
              返回 {data.owners?.rows?.length || 0} /{' '}
              {data.owners?.total == null
                ? '—'
                : formatNumber(data.owners.total)}
            </span>
            <span>Custody 地址不等于受益所有人</span>
          </footer>
        </Panel>
      </div>

      <section className="method-strip">
        <ShieldAlert />
        <div>
          <strong>读数边界</strong>
          <p>
            USDG 仅按 1 USDG = 1 quote dollar
            作为报价基准，并非法币美元预言机。手续费为池级估算，未扣未知协议或
            Hook 分成，也不等于 LP 已实现收益。
          </p>
        </div>
        <Link href="/guide">
          查看方法论 <ExternalLink />
        </Link>
      </section>
    </AppShell>
  );
}

function PoolsTable({ rows, loading }: { rows: PoolRow[]; loading: boolean }) {
  if (loading) return <TableLoading columns={8} />;
  if (!rows.length)
    return <EmptyState>当前筛选没有返回可展示的池。</EmptyState>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>交易对</TableHead>
          <TableHead>协议</TableHead>
          <TableHead className="text-right">费率</TableHead>
          <TableHead className="text-right">TVL</TableHead>
          <TableHead className="text-right">成交额</TableHead>
          <TableHead className="text-right">手续费</TableHead>
          <TableHead className="text-right">交换</TableHead>
          <TableHead className="text-right">价格变化</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const id = row.id || row.address || '';
          const change = row.price_change_pct;
          return (
            <TableRow key={id || index}>
              <TableCell>
                <Link
                  className="pair-cell"
                  href={`/pool?id=${encodeURIComponent(id)}`}
                  aria-label={`打开 ${pairLabel(row)} 池分析`}
                >
                  <span className="token-pair-icon" aria-hidden="true">
                    <i />
                    <i />
                  </span>
                  <span>
                    <strong>{pairLabel(row)}</strong>
                    <small title={row.risks?.join('；') || undefined}>
                      {shortHash(id, 8, 6)}
                      {row.risks?.length ? ` · ${row.risks.length} 条边界` : ''}
                    </small>
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="protocol-badge">
                  {(row.protocol || row.kind || '—').toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right mono-cell">
                {formatFee(row.fee_ppm)}
              </TableCell>
              <TableCell className="text-right mono-cell">
                {formatUsd(row.tvl_usd)}
              </TableCell>
              <TableCell className="text-right mono-cell strong-cell">
                {formatUsd(row.volume_usd)}
              </TableCell>
              <TableCell className="text-right mono-cell">
                {formatUsd(row.fees_usd)}
              </TableCell>
              <TableCell className="text-right mono-cell">
                {formatNumber(row.swaps)}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right mono-cell change-cell',
                  change != null && change >= 0
                    ? 'is-positive'
                    : change != null && 'is-negative',
                )}
              >
                {change == null ? null : change >= 0 ? (
                  <ArrowUp />
                ) : (
                  <ArrowDown />
                )}
                {formatPercent(change)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function FeedList({
  rows,
  loading,
  tick,
}: {
  rows: TapeRow[];
  loading: boolean;
  tick: number;
}) {
  void tick;
  if (loading) {
    return (
      <div className="feed-list">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-[68px] w-full bg-white/5" />
        ))}
      </div>
    );
  }
  if (!rows.length) return <EmptyState>这个窗口暂时没有匹配事件。</EmptyState>;
  return (
    <div className="feed-list">
      {rows.map((row, index) => {
        const kind = String(row.kind || 'event').toLowerCase();
        const size =
          row.size_usd ??
          row.volume_usd ??
          row.deposit_usd ??
          row.withdrawal_usd;
        return (
          <article
            className="feed-row"
            key={`${row.id || row.tx_hash || index}`}
          >
            <span className={cn('event-icon', `event-${kind}`)}>
              {kind === 'swap' ? (
                <Zap />
              ) : kind === 'add' ? (
                <ArrowDown />
              ) : kind === 'remove' ? (
                <ArrowUp />
              ) : (
                <Sparkles />
              )}
            </span>
            <div className="feed-main">
              <div>
                <strong>{kind.toUpperCase()}</strong>
                <span>{pairLabel(row)}</span>
              </div>
              <p title={row.owner || row.custody || ''}>
                {shortHash(row.owner || row.custody, 7, 5)} ·{' '}
                {age(row.timestamp)} 前
              </p>
            </div>
            <div className="feed-value">
              <strong>{formatUsd(size)}</strong>
              {row.tx_hash ? (
                <a
                  href={`https://robinhoodchain.blockscout.com/tx/${row.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="在 Blockscout 查看交易"
                >
                  <ExternalLink />
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function OwnersTable({
  rows,
  loading,
  tick,
}: {
  rows: OwnerRow[];
  loading: boolean;
  tick: number;
}) {
  void tick;
  if (loading) return <TableLoading columns={7} />;
  if (!rows.length)
    return <EmptyState>这个窗口暂时没有匹配的钱包。</EmptyState>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>身份</TableHead>
          <TableHead>最近活动</TableHead>
          <TableHead>池</TableHead>
          <TableHead className="text-right">持仓</TableHead>
          <TableHead className="text-right">手续费</TableHead>
          <TableHead className="text-right">净收益</TableHead>
          <TableHead>覆盖</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const identity = row.owner || row.custody || '';
          const qualified =
            row.coverage?.qualified === true &&
            row.coverage?.cost_qualified === true;
          return (
            <TableRow key={`${identity}-${index}`}>
              <TableCell>
                <Link
                  className="identity-cell"
                  href={`/research?owner=${encodeURIComponent(identity)}`}
                >
                  <span
                    className={cn(
                      'wallet-avatar',
                      row.owner ? 'is-owner' : 'is-custody',
                    )}
                  >
                    <WalletCards />
                  </span>
                  <span>
                    <strong>{shortHash(identity, 8, 6)}</strong>
                    <small>
                      {row.owner ? '受益所有人' : '托管 / 管理合约'}
                    </small>
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <span className="action-cell">
                  <strong>{row.activity?.kind?.toUpperCase() || '—'}</strong>
                  <small>{age(row.activity?.timestamp)} 前</small>
                </span>
              </TableCell>
              <TableCell>{row.activity?.pair || '—'}</TableCell>
              <TableCell className="text-right mono-cell">
                {formatNumber(row.open_positions)}
                <small className="sub-number">
                  {' '}
                  / {formatNumber(row.positions)}
                </small>
              </TableCell>
              <TableCell className="text-right mono-cell">
                {formatUsd(row.fees_usd)}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right mono-cell',
                  row.net_pnl_usd != null && row.net_pnl_usd >= 0
                    ? 'is-positive'
                    : row.net_pnl_usd != null && 'is-negative',
                )}
              >
                {formatUsd(row.net_pnl_usd)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    'quality-badge',
                    qualified ? 'is-good' : 'is-warn',
                  )}
                >
                  <span />
                  {qualified ? 'Net ready' : 'Partial'}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function TableLoading({ columns }: { columns: number }) {
  return (
    <div className="table-loading" aria-label="正在加载">
      {Array.from({ length: 6 }, (_, row) => (
        <div
          key={row}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(72px, 1fr))`,
          }}
        >
          {Array.from({ length: columns }, (__, column) => (
            <Skeleton key={column} className="h-4 w-4/5 bg-white/5" />
          ))}
        </div>
      ))}
    </div>
  );
}
