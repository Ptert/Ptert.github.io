'use client';

/* oxlint-disable react/react-compiler next/no-html-link-for-pages */

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Braces,
  ChevronsUpDown,
  CircleDot,
  Copy,
  Crosshair,
  ExternalLink,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Waves,
} from 'lucide-react';
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
  displayText,
  formatFee,
  formatNumber,
  formatTime,
  formatUsd,
  pairLabel,
  shortHash,
} from '@/lib/format';
import {
  api,
  describeError,
  type PoolRow,
  type Status,
  type WorkbenchDetail,
} from '@/lib/rhpools-api';
import { cn } from '@/lib/utils';

const DEFAULT_POOL = '0xd4eb21209c4d6093f80b5b84f5c45cc093ea14a3';

export function PoolWorkbench() {
  const [catalog, setCatalog] = useState<PoolRow[]>([]);
  const [catalogTotal, setCatalogTotal] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [sort, setSort] = useState('activity');
  const [selectedId, setSelectedId] = useState('');
  const [owner, setOwner] = useState('');
  const [detail, setDetail] = useState<WorkbenchDetail | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rangeWidth, setRangeWidth] = useState(10);
  const [capital, setCapital] = useState('10000');
  const initialId = useRef('');
  const detailControllerRef = useRef<AbortController | null>(null);
  const detailRequestRef = useRef(0);
  const detailKeyRef = useRef('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    initialId.current = params.get('id') || '';
    setSelectedId(initialId.current || DEFAULT_POOL);
    setOwner(params.get('owner') || '');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        setCatalogLoading(true);
        try {
          const response = await api.workbenchPools(
            { q: query.trim(), kind, sort, limit: 30, offset: 0 },
            controller.signal,
          );
          setCatalog(response.rows || []);
          setCatalogTotal(response.total ?? null);
          setError(null);
          if (response.rows?.[0]) {
            setSelectedId(
              (current) =>
                current ||
                response.rows[0].id ||
                response.rows[0].address ||
                DEFAULT_POOL,
            );
          }
        } catch (requestError) {
          if (!controller.signal.aborted) setError(describeError(requestError));
        } finally {
          if (!controller.signal.aborted) setCatalogLoading(false);
        }
      },
      query ? 280 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, kind, sort]);

  const loadDetail = useCallback(
    async (quiet = false) => {
      if (!selectedId) return;
      const request = ++detailRequestRef.current;
      detailControllerRef.current?.abort();
      const controller = new AbortController();
      detailControllerRef.current = controller;
      const normalizedOwner = /^0x[0-9a-f]{40}$/i.test(owner)
        ? owner.toLowerCase()
        : undefined;
      const requestKey = `${selectedId}:${normalizedOwner || ''}`;
      if (!quiet) {
        setDetailLoading(true);
        if (detailKeyRef.current !== requestKey) setDetail(null);
      }
      detailKeyRef.current = requestKey;
      try {
        const [poolResult, statusResult] = await Promise.allSettled([
          api.workbenchPool(selectedId, normalizedOwner, controller.signal),
          api.status(controller.signal),
        ]);
        if (request !== detailRequestRef.current || controller.signal.aborted)
          return;
        if (poolResult.status === 'fulfilled') {
          setDetail(poolResult.value);
          setError(
            statusResult.status === 'rejected'
              ? '池快照已更新，但索引健康状态暂时不可用。'
              : null,
          );
          const params = new URLSearchParams({ id: selectedId });
          if (normalizedOwner) params.set('owner', normalizedOwner);
          window.history.replaceState(null, '', `/pool?${params}`);
        } else {
          setError(describeError(poolResult.reason));
        }
        if (statusResult.status === 'fulfilled') setStatus(statusResult.value);
      } catch (requestError) {
        if (
          request === detailRequestRef.current &&
          !controller.signal.aborted
        ) {
          setError(describeError(requestError));
        }
      } finally {
        if (
          request === detailRequestRef.current &&
          !controller.signal.aborted
        ) {
          setDetailLoading(false);
          if (detailControllerRef.current === controller)
            detailControllerRef.current = null;
        }
      }
    },
    [selectedId, owner],
  );

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    const schedule = (delay = 20_000) => {
      if (stopped || !selectedId) return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (stopped) return;
        if (detailControllerRef.current) {
          schedule();
          return;
        }
        if (!document.hidden && navigator.onLine) await loadDetail(true);
        schedule();
      }, delay);
    };

    const resume = () => {
      if (!document.hidden && navigator.onLine && !detailControllerRef.current)
        schedule(0);
    };

    void loadDetail(false).finally(() => schedule());
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
      detailControllerRef.current?.abort();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [loadDetail, selectedId]);

  const selectedRow = useMemo(
    () =>
      catalog.find((row) => (row.id || row.address) === selectedId) ||
      detail?.pool ||
      null,
    [catalog, selectedId, detail],
  );
  const detailState = String(
    detail?.health?.state || detail?.pool?.state || 'connecting',
  ).toLowerCase();
  const hasSnapshot = Number(detail?.block || 0) > 0;
  const detailHealthy = ['live', 'ok', 'ready'].includes(detailState);
  const minuteQualification =
    detail?.coverage?.swaps_1m?.qualification || 'coverage unavailable';

  const copyId = async () => {
    if (!selectedId) return;
    await navigator.clipboard.writeText(selectedId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <AppShell
      activePath="/pool"
      status={{
        state: status?.state,
        indexedHead: status?.indexed_head,
        lagBlocks: status?.lag_blocks,
      }}
    >
      <PageIntro
        eyebrow="POOL WORKBENCH · READ ONLY"
        title="池深度与仓位分析台"
        description="在同一快照区块检查池状态、价格轨迹、LP 仓位和近期事件。线上复刻版保持只读，不准备、签名或广播交易。"
        actions={
          <Button
            variant="outline"
            size="lg"
            onClick={() => void loadDetail(false)}
            disabled={detailLoading}
          >
            <RefreshCw className={cn(detailLoading && 'animate-spin')} />
            刷新快照
          </Button>
        }
      />

      {error ? (
        <Alert className="terminal-alert">
          <AlertTriangle />
          <AlertTitle>读取受限</AlertTitle>
          <AlertDescription>
            {error}；如已有快照，页面会保留最近一次确认的数据。
          </AlertDescription>
        </Alert>
      ) : null}

      {detail && !hasSnapshot ? (
        <Alert className="coverage-alert">
          <AlertTriangle />
          <AlertTitle>池快照尚未就绪</AlertTitle>
          <AlertDescription>
            {detail.health?.error || `当前池状态为 ${detailState}`};
            区块、价格、流动性与仓位读数在就绪前保持未知。
          </AlertDescription>
        </Alert>
      ) : null}

      {detail && hasSnapshot && !detailHealthy ? (
        <Alert className="coverage-alert">
          <AlertTriangle />
          <AlertTitle>池快照部分可用</AlertTitle>
          <AlertDescription>
            当前状态为 {detailState.toUpperCase()}：下方展示固定在区块 #
            {formatNumber(detail.block)}{' '}
            的可用字段；缺失字段保持未知，历史覆盖可能仍不完整。
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="workbench-layout">
        <aside className="catalog-panel">
          <header>
            <div>
              <p>POOL CENSUS</p>
              <h2>选择流动性池</h2>
            </div>
            <Badge variant="outline">
              {catalogTotal == null ? '—' : formatNumber(catalogTotal)}
            </Badge>
          </header>
          <div className="catalog-search">
            <Search />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pair、协议或 Pool ID"
              aria-label="搜索池"
            />
          </div>
          <div className="catalog-filters">
            <NativeSelect
              aria-label="池协议版本"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              size="sm"
            >
              <NativeSelectOption value="">全部版本</NativeSelectOption>
              <NativeSelectOption value="v2">V2</NativeSelectOption>
              <NativeSelectOption value="v3">V3</NativeSelectOption>
              <NativeSelectOption value="v4">V4</NativeSelectOption>
            </NativeSelect>
            <NativeSelect
              aria-label="池目录排序"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              size="sm"
            >
              <NativeSelectOption value="activity">最近活动</NativeSelectOption>
              <NativeSelectOption value="liquidity">流动性</NativeSelectOption>
              <NativeSelectOption value="fees">手续费</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="pool-catalog-list" aria-busy={catalogLoading}>
            {catalogLoading && !catalog.length
              ? Array.from({ length: 8 }, (_, index) => (
                  <Skeleton
                    key={index}
                    className="h-[78px] w-full bg-white/5"
                  />
                ))
              : catalog.map((row, index) => {
                  const id = row.id || row.address || '';
                  return (
                    <button
                      type="button"
                      className={cn(
                        'catalog-row',
                        selectedId === id && 'is-active',
                      )}
                      key={id || index}
                      onClick={() => {
                        detailRequestRef.current += 1;
                        detailControllerRef.current?.abort();
                        setDetail(null);
                        setError(null);
                        setSelectedId(id);
                      }}
                      aria-label={`选择 ${pairLabel(row)} 池`}
                    >
                      <span className="catalog-row-top">
                        <strong>{pairLabel(row)}</strong>
                        <Badge variant="outline">
                          {(row.kind || row.protocol || '—').toUpperCase()}
                        </Badge>
                      </span>
                      <span className="catalog-row-meta">
                        <span>{formatFee(row.fee_ppm)} fee</span>
                        <span>{shortHash(id, 6, 5)}</span>
                      </span>
                      <span className="catalog-row-bottom">
                        <span className={cn(row.last_swap_at && 'is-live')}>
                          <i />
                          {row.last_swap_at
                            ? `${age(row.last_swap_at)} 前`
                            : '近期交换未知'}
                        </span>
                        <strong>
                          {row.swaps_1h == null
                            ? '—'
                            : `${formatNumber(row.swaps_1h)} swaps`}
                        </strong>
                      </span>
                    </button>
                  );
                })}
            {!catalogLoading && !catalog.length ? (
              <EmptyState>没有找到匹配的池。</EmptyState>
            ) : null}
          </div>
        </aside>

        <div className="workbench-main">
          <section className="pool-identity-card">
            <div className="pool-identity-main">
              <span className="pool-glyph">
                <Waves />
              </span>
              <div>
                <p>
                  <Badge variant="outline">
                    {(
                      selectedRow?.kind ||
                      selectedRow?.protocol ||
                      'POOL'
                    ).toUpperCase()}
                  </Badge>
                  <span>{selectedRow?.protocol || '协议待确认'}</span>
                </p>
                <h2>
                  {selectedRow ? pairLabel(selectedRow) : '正在读取池信息'}
                </h2>
                <button
                  type="button"
                  onClick={() => void copyId()}
                  className="copy-address"
                  title="复制完整 Pool ID"
                >
                  {shortHash(selectedId, 14, 10)} <Copy />{' '}
                  {copied ? '已复制' : ''}
                </button>
              </div>
            </div>
            <div className="pool-live-state">
              <span
                className={cn(
                  'status-orb',
                  hasSnapshot && detailHealthy ? 'is-live' : 'is-warn',
                )}
              />
              <span>
                <small>池快照</small>
                <strong>
                  {hasSnapshot
                    ? `#${formatNumber(detail?.block)}`
                    : detailState.toUpperCase()}
                </strong>
              </span>
            </div>
          </section>

          <div className="workbench-metrics">
            <MiniMetric
              label="Spot · USDG quote"
              value={
                hasSnapshot && detail?.spot?.price_usd != null
                  ? formatUsd(detail.spot.price_usd, false)
                  : '—'
              }
              note={`Tick ${hasSnapshot ? formatNumber(detail?.spot?.tick) : '—'} · not a fiat oracle`}
              icon={<Crosshair />}
            />
            <MiniMetric
              label="1M priced volume"
              value={hasSnapshot ? formatUsd(detail?.lp?.volume_1m_usd) : '—'}
              note={`${hasSnapshot ? formatNumber(detail?.lp?.swaps_1m) : '—'} swaps · ${minuteQualification}`}
              icon={<Activity />}
            />
            <MiniMetric
              label="1M pool fees"
              value={
                hasSnapshot ? formatUsd(detail?.lp?.pool_fees_1m_usd) : '—'
              }
              note="Gross estimate on priced swaps"
              icon={<BarChart3 />}
            />
            <MiniMetric
              label="Current pool fee"
              value={hasSnapshot ? formatFee(detail?.pool?.fee_ppm) : '—'}
              note={
                detail?.pool?.kind === 'v4'
                  ? 'Current dynamic-capable fee'
                  : 'Current pool fee'
              }
              icon={<Layers3 />}
            />
            <MiniMetric
              label="Active liquidity"
              value={hasSnapshot ? compactRaw(detail?.liquidity?.active) : '—'}
              note={detail?.liquidity?.model || 'raw pool-local L'}
              icon={<CircleDot />}
            />
          </div>

          <div className="workbench-grid">
            <Panel
              className="depth-panel"
              kicker="BLOCK-PINNED OBSERVATION"
              title="价格轨迹"
              action={
                <Badge
                  variant="outline"
                  className={
                    hasSnapshot && detailHealthy
                      ? 'quality-good'
                      : 'quality-warn'
                  }
                >
                  {hasSnapshot
                    ? `${detailState.toUpperCase()} · BLOCK-PINNED`
                    : 'SNAPSHOT WARMING'}
                </Badge>
              }
            >
              {detailLoading && !detail ? (
                <Skeleton className="m-5 h-72 bg-white/5" />
              ) : (
                <TrackingChart detail={detail} />
              )}
            </Panel>

            <Panel
              className="allocation-panel"
              kicker="ANALYSIS ONLY"
              title="区间配置预览"
              action={<SlidersHorizontal />}
            >
              <div className="allocation-body">
                <label htmlFor="allocation-capital">
                  <span>假设投入（USDG quote）</span>
                  <Input
                    id="allocation-capital"
                    inputMode="decimal"
                    value={capital}
                    onChange={(event) => setCapital(event.target.value)}
                  />
                </label>
                <fieldset className="range-presets">
                  <legend className="sr-only">区间宽度</legend>
                  {[2, 10, 25, 100].map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={cn(rangeWidth === value && 'is-active')}
                      onClick={() => setRangeWidth(value)}
                    >
                      {value === 100 ? 'FULL' : `±${value}%`}
                    </button>
                  ))}
                </fieldset>
                <div
                  className="range-visual"
                  aria-label={`当前选择正负 ${rangeWidth}% 区间`}
                >
                  <div className="range-track">
                    <span
                      style={{
                        left: `${50 - Math.min(46, rangeWidth / 2)}%`,
                        right: `${50 - Math.min(46, rangeWidth / 2)}%`,
                      }}
                    />
                    <i />
                  </div>
                  <div>
                    <span>
                      {rangeWidth === 100 ? 'MIN TICK' : `-${rangeWidth}%`}
                    </span>
                    <strong>SPOT</strong>
                    <span>
                      {rangeWidth === 100 ? 'MAX TICK' : `+${rangeWidth}%`}
                    </span>
                  </div>
                </div>
                <dl className="allocation-readout">
                  <div>
                    <dt>资本</dt>
                    <dd>{formatUsd(Number(capital), false)}</dd>
                  </div>
                  <div>
                    <dt>分布</dt>
                    <dd>均匀单区间</dd>
                  </div>
                  <div>
                    <dt>预计仓位</dt>
                    <dd>
                      {rangeWidth === 100 ? '全范围' : `Spot ± ${rangeWidth}%`}
                    </dd>
                  </div>
                </dl>
                <p className="fine-print">
                  这里只展示输入结构。精确 token split、tick 对齐和历史 replay
                  需要服务端 allocation 模型；本页不会发起交易。
                </p>
              </div>
            </Panel>

            <Panel
              className="positions-panel"
              kicker="OWNER / CUSTODY AWARE"
              title="已观测仓位"
              action={
                <span className="panel-count">
                  {detail?.positions?.length ?? 0}
                </span>
              }
            >
              <GenericPositions
                rows={detail?.positions || []}
                detail={detail}
                owner={owner}
              />
            </Panel>

            <Panel
              className="events-panel"
              kicker="RECENT CANONICAL EVENTS"
              title="池事件"
              action={
                <span className="panel-count">
                  {detail?.lp_events?.length ?? 0}
                </span>
              }
            >
              <GenericEvents rows={detail?.lp_events || []} detail={detail} />
            </Panel>
          </div>

          <section className="read-only-banner">
            <ShieldCheck />
            <div>
              <strong>只读安全边界</strong>
              <p>
                原服务仅在 loopback 且显式启用时准备未签名
                calldata；这个独立部署版不暴露 simulate / prepare / broadcast。
              </p>
            </div>
            <a
              href="https://github.com/wock9000/robinhoodpools/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看边界 <ExternalLink />
            </a>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function MiniMetric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="mini-metric">
      <header>
        <span>{icon}</span>
        <p>{label}</p>
      </header>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function compactRaw(value: string | number | null | undefined) {
  if (value == null) return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return shortHash(String(value), 10, 4);
  return formatNumber(number, {
    notation: Math.abs(number) > 1e6 ? 'compact' : 'standard',
    maximumFractionDigits: 2,
  });
}

function TrackingChart({ detail }: { detail: WorkbenchDetail | null }) {
  const points = (detail?.tracking || [])
    .filter((point) => Number.isFinite(Number(point.price_token1_per_token0)))
    .slice(-180);
  if (points.length < 2) {
    return (
      <div className="chart-empty">
        <Waves />
        <strong>当前快照没有足够的价格采样</strong>
        <p>池可能尚无近期交换，或价格轨迹仍在索引。</p>
      </div>
    );
  }
  const values = points.map((point) => Number(point.price_token1_per_token0));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || Math.max(Math.abs(maximum) * 0.01, 1);
  const coordinates = values.map((value, index) => ({
    x: 18 + (index / (values.length - 1)) * 764,
    y: 245 - ((value - minimum) / spread) * 205,
  }));
  const line = coordinates
    .map(
      (point, index) =>
        `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(' ');
  const area = `${line} L 782 270 L 18 270 Z`;
  const last = coordinates.at(-1)!;
  return (
    <div className="tracking-chart">
      <div className="chart-readout">
        <span>
          <small>Token1 / Token0</small>
          <strong>
            {formatNumber(values.at(-1), { maximumFractionDigits: 8 })}
          </strong>
        </span>
        <span>
          <small>采样</small>
          <strong>{points.length}</strong>
        </span>
      </div>
      <svg viewBox="0 0 800 290" aria-label="池价格轨迹">
        <title>池价格轨迹</title>
        <defs>
          <linearGradient id="poolArea" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0"
              stopColor="var(--signal-violet)"
              stopOpacity=".38"
            />
            <stop offset="1" stopColor="var(--signal-violet)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[45, 95, 145, 195, 245].map((y) => (
          <line
            key={y}
            x1="18"
            x2="782"
            y1={y}
            y2={y}
            className="chart-gridline"
          />
        ))}
        <path d={area} fill="url(#poolArea)" />
        <path d={line} className="chart-line" />
        <circle cx={last.x} cy={last.y} r="5" className="chart-dot" />
      </svg>
      <div className="chart-axis">
        <span>{formatTime(points[0]?.timestamp)}</span>
        <span>SNAPSHOT #{formatNumber(detail?.block)}</span>
        <span>{formatTime(points.at(-1)?.timestamp)}</span>
      </div>
    </div>
  );
}

function GenericPositions({
  rows,
  detail,
  owner,
}: {
  rows: Array<Record<string, unknown>>;
  detail: WorkbenchDetail | null;
  owner: string;
}) {
  const coverage = detail?.coverage?.positions;
  if (coverage?.supported === false) {
    return (
      <EmptyState>
        当前协议不支持逐仓位读取；这不代表该池没有 LP 仓位。
      </EmptyState>
    );
  }
  if (!/^0x[0-9a-f]{40}$/i.test(owner)) {
    return (
      <EmptyState>
        从“地址研究”选择一个 owner，才能读取该身份在本池的仓位。
      </EmptyState>
    );
  }
  if (!rows.length && coverage?.complete !== true) {
    return (
      <EmptyState>仓位范围仍在索引，当前空结果不代表没有仓位。</EmptyState>
    );
  }
  if (!rows.length)
    return (
      <EmptyState>当前 owner 在已完成的观测范围内没有返回仓位。</EmptyState>
    );
  const symbol0 = tokenSymbol(detail?.pool?.token0, 'TOKEN0');
  const symbol1 = tokenSymbol(detail?.pool?.token1, 'TOKEN1');
  const tick = Number(detail?.spot?.tick);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>身份</TableHead>
          <TableHead>区间</TableHead>
          <TableHead>状态</TableHead>
          <TableHead className="text-right">Token 数量</TableHead>
          <TableHead className="text-right">待领取</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, 12).map((row, index) => {
          const lo = Number(row.lo);
          const hi = Number(row.hi);
          const inRange =
            Number.isFinite(lo) && Number.isFinite(hi) && Number.isFinite(tick)
              ? lo <= tick && tick < hi
              : null;
          const identity = displayText(row.owner, owner);
          const positionId = displayText(row.id, String(index));
          return (
            <TableRow key={positionId}>
              <TableCell>
                <span className="identity-inline">
                  {shortHash(identity, 7, 5)}
                  <small>
                    {detail?.pool?.kind?.toUpperCase() || 'POOL POSITION'}
                  </small>
                </span>
              </TableCell>
              <TableCell className="mono-cell">
                {formatNumber(row.lo as string | number | null | undefined)} →{' '}
                {formatNumber(row.hi as string | number | null | undefined)}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={inRange === true ? 'quality-good' : 'quality-warn'}
                >
                  {inRange == null ? 'UNKNOWN' : inRange ? 'IN RANGE' : 'OUT'}
                </Badge>
              </TableCell>
              <TableCell className="text-right mono-cell">
                {formatTokenPair(row.amount0, symbol0, row.amount1, symbol1)}
              </TableCell>
              <TableCell className="text-right mono-cell">
                {formatTokenPair(
                  row.uncollected0 ?? row.fees0,
                  symbol0,
                  row.uncollected1 ?? row.fees1,
                  symbol1,
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function tokenSymbol(token: PoolRow['token0'], fallback: string) {
  if (typeof token === 'string') return shortHash(token, 5, 3);
  return (
    token?.symbol ||
    (token?.address ? shortHash(token.address, 5, 3) : fallback)
  );
}

function formatTokenPair(
  first: unknown,
  firstSymbol: string,
  second: unknown,
  secondSymbol: string,
) {
  const value = (item: unknown) =>
    formatNumber(item as string | number | null | undefined, {
      maximumSignificantDigits: 6,
    });
  const firstValue = value(first);
  const secondValue = value(second);
  if (firstValue === '—' && secondValue === '—') return '—';
  return `${firstValue} ${firstSymbol} · ${secondValue} ${secondSymbol}`;
}

function GenericEvents({
  rows,
  detail,
}: {
  rows: Array<Record<string, unknown>>;
  detail: WorkbenchDetail | null;
}) {
  const coverage = detail?.coverage?.lp_events;
  if (coverage?.supported === false) {
    return (
      <EmptyState>
        当前协议不支持逐笔 LP 生命周期事件；这不代表没有链上活动。
      </EmptyState>
    );
  }
  if (!rows.length && coverage?.lifecycle_history_complete !== true) {
    return (
      <EmptyState>
        {coverage?.error
          ? `LP 事件历史不可用：${coverage.error}`
          : 'LP 事件历史仍在索引，当前空结果不代表没有事件。'}
      </EmptyState>
    );
  }
  if (!rows.length)
    return <EmptyState>已完成的保留窗口内没有返回近期 LP 事件。</EmptyState>;
  return (
    <div className="workbench-events">
      {rows.slice(0, 12).map((row, index) => {
        const kind = displayText(row.kind, displayText(row.action, 'event'));
        const tx = displayText(row.tx_hash, '');
        const eventId = displayText(row.id, tx || String(index));
        const identity = displayText(row.owner, displayText(row.custody, ''));
        return (
          <article key={eventId}>
            <span className={cn('event-icon', `event-${kind}`)}>
              <Braces />
            </span>
            <div>
              <strong>{kind.toUpperCase()}</strong>
              <p>
                {shortHash(identity, 7, 5)} · {age(row.timestamp as number)}
              </p>
            </div>
            <span>
              {formatUsd(
                (row.size_usd ?? row.deposit_usd ?? row.withdrawal_usd) as
                  | string
                  | number
                  | null
                  | undefined,
              )}
            </span>
            {tx ? (
              <a
                href={`https://robinhoodchain.blockscout.com/tx/${tx}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="在 Blockscout 查看交易"
              >
                <ExternalLink />
              </a>
            ) : (
              <ChevronsUpDown />
            )}
          </article>
        );
      })}
    </div>
  );
}
