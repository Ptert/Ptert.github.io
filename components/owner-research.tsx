'use client';

/* oxlint-disable react/react-compiler next/no-html-link-for-pages */

import {
  AlertTriangle,
  ArrowRight,
  Blocks,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  FlaskConical,
  Layers3,
  Radar,
  Search,
  ShieldQuestion,
  Timer,
  WalletCards,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';

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
import { age, formatNumber, formatUsd, shortHash } from '@/lib/format';
import {
  API_ORIGIN,
  api,
  describeError,
  type ResearchPosition,
  type ResearchResponse,
  type Status,
  type WindowKey,
} from '@/lib/rhpools-api';
import { cn } from '@/lib/utils';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const EXAMPLE_OWNER = '0x267444d099b10fb5ed7c3cc7b7c767adca574952';
const WINDOWS: WindowKey[] = ['1h', '24h', '7d', '30d', 'all'];

function normalizeWindow(value: string | null): WindowKey {
  return WINDOWS.includes(value as WindowKey) ? (value as WindowKey) : '30d';
}

export function OwnerResearch() {
  const [input, setInput] = useState('');
  const [windowKey, setWindowKey] = useState<WindowKey>('30d');
  const [data, setData] = useState<ResearchResponse | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  const queryKeyRef = useRef('');

  const load = useCallback(
    async (owner: string, selectedWindow = windowKey, push = true) => {
      const normalized = owner.trim().toLowerCase();
      const request = ++requestRef.current;
      controllerRef.current?.abort();
      if (!ADDRESS_RE.test(normalized)) {
        queryKeyRef.current = '';
        setData(null);
        setLoading(false);
        setError('请输入 0x 开头的 20-byte Robinhood Chain 地址。');
        return;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      const queryKey = `${normalized}:${selectedWindow}`;
      if (queryKeyRef.current !== queryKey) setData(null);
      queryKeyRef.current = queryKey;
      setLoading(true);
      setError(null);
      try {
        const [researchResult, statusResult] = await Promise.allSettled([
          api.researchOwner(normalized, selectedWindow, controller.signal),
          api.status(controller.signal),
        ]);
        if (request !== requestRef.current || controller.signal.aborted) return;
        if (researchResult.status === 'fulfilled') {
          const research = researchResult.value;
          setData(research);
          setInput(normalized);
          setWindowKey(research.window as WindowKey);
          setError(
            statusResult.status === 'rejected'
              ? '研究结果已返回，但索引健康状态暂时不可用。'
              : null,
          );
          if (push) {
            const params = new URLSearchParams({
              owner: normalized,
              window: research.window,
            });
            window.history.pushState(null, '', `/research?${params}`);
          }
        } else {
          setError(describeError(researchResult.reason));
        }
        if (statusResult.status === 'fulfilled') setStatus(statusResult.value);
      } catch (requestError) {
        if (request === requestRef.current && !controller.signal.aborted) {
          setError(describeError(requestError));
        }
      } finally {
        if (request === requestRef.current && !controller.signal.aborted) {
          setLoading(false);
          if (controllerRef.current === controller)
            controllerRef.current = null;
        }
      }
    },
    [windowKey],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const owner = params.get('owner') || '';
    const selectedWindow = normalizeWindow(params.get('window'));
    setInput(owner);
    setWindowKey(selectedWindow);
    if (ADDRESS_RE.test(owner)) void load(owner, selectedWindow, false);
    else {
      if (owner) setError('URL 中的 owner 不是有效的 20-byte 地址。');
      void api
        .status()
        .then(setStatus)
        .catch(() => undefined);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const owner = params.get('owner') || '';
      const selectedWindow = normalizeWindow(params.get('window'));
      setInput(owner);
      setWindowKey(selectedWindow);
      if (ADDRESS_RE.test(owner)) void load(owner, selectedWindow, false);
      else {
        requestRef.current += 1;
        controllerRef.current?.abort();
        queryKeyRef.current = '';
        setData(null);
        setLoading(false);
        setError(owner ? 'URL 中的 owner 不是有效的 20-byte 地址。' : null);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [load]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const submit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    void load(input, windowKey, true);
  };

  const coverage = data?.coverage || {};
  const allocation = data?.allocation || {};
  const configurations = data?.configurations || {};
  const activity = data?.activity || {};
  const pools = allocation.pools || [];
  const positions = configurations.positions || [];
  const lifecycle = activity.recent_lifecycle || [];
  const identity = coverage.identity || {};

  const coverageWarnings: string[] = [];
  if (data && coverage.window_complete !== true)
    coverageWarnings.push('请求窗口的历史覆盖尚未被证明完整');
  if (data && coverage.possible_position_truncation)
    coverageWarnings.push('地址仓位超过研究端点的返回上限');
  if (
    data &&
    coverage.valuation?.complete_for_returned_current_positions !== true
  )
    coverageWarnings.push('部分或全部仓位缺少完整 USDG 报价');

  return (
    <AppShell
      activePath="/research"
      status={{
        state: status?.state,
        indexedHead: status?.indexed_head,
        lagBlocks: status?.lag_blocks,
      }}
    >
      <PageIntro
        eyebrow="OWNER RESEARCH · EVIDENCE FIRST"
        title="地址研究，而不是策略猜测。"
        description="查看经验证的受益所有人、托管归属、当前分配、配置偏好和仓位生命周期。所有结论都附带覆盖范围与估值边界。"
      />

      <form className="research-search" onSubmit={submit}>
        <div className="research-input-wrap">
          <Search />
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入 0x 钱包或 custody 地址"
            aria-label="地址"
          />
        </div>
        <NativeSelect
          value={windowKey}
          onChange={(event) => setWindowKey(event.target.value as WindowKey)}
          aria-label="研究窗口"
        >
          <NativeSelectOption value="1h">1 小时</NativeSelectOption>
          <NativeSelectOption value="24h">24 小时</NativeSelectOption>
          <NativeSelectOption value="7d">7 天</NativeSelectOption>
          <NativeSelectOption value="30d">30 天</NativeSelectOption>
          <NativeSelectOption value="all">全部已索引</NativeSelectOption>
        </NativeSelect>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? '研究中…' : '研究地址'} <ArrowRight />
        </Button>
        {!input ? (
          <button
            type="button"
            className="example-link"
            onClick={() => {
              setInput(EXAMPLE_OWNER);
              void load(EXAMPLE_OWNER, windowKey, true);
            }}
          >
            载入示例地址
          </button>
        ) : null}
      </form>

      {error ? (
        <Alert className="terminal-alert">
          <AlertTriangle />
          <AlertTitle>无法完成研究</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!data && !loading ? (
        <section className="research-empty">
          <span>
            <Radar />
          </span>
          <h2>从一个完整地址开始</h2>
          <p>
            输入钱包或仓位管理合约地址，系统会在已索引的受益所有人与 custody
            证据中检索。
          </p>
          <div>
            <span>
              <CheckCircle2 /> 身份分离
            </span>
            <span>
              <CheckCircle2 /> Block-pinned 估值
            </span>
            <span>
              <CheckCircle2 /> 生命周期证据
            </span>
          </div>
        </section>
      ) : null}

      {loading && !data ? <ResearchSkeleton /> : null}

      {data && coverage.found === false ? (
        <section className="research-empty">
          <span>
            <Radar />
          </span>
          <h2>已索引范围内未找到这个地址</h2>
          <p>
            “未观测到”不等于零仓位或从未参与；它只表示当前索引覆盖与身份证据没有返回匹配记录。
          </p>
          <a
            className="guide-cta"
            href={`${API_ORIGIN}/api/v1/research/owner?owner=${encodeURIComponent(data.owner)}&window=${data.window}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            查看原始响应 <ExternalLink />
          </a>
        </section>
      ) : null}

      {data && coverage.found !== false ? (
        <>
          <section className="identity-banner">
            <div className="identity-mark">
              <WalletCards />
            </div>
            <div className="identity-title">
              <p>OBSERVED IDENTITY</p>
              <h2>{shortHash(data.owner, 14, 10)}</h2>
              <span>
                {identity.basis === 'verified_owner'
                  ? '受益所有人已验证'
                  : identity.basis || '身份依据待确认'}
              </span>
            </div>
            <div className="identity-badges">
              <Badge
                variant="outline"
                className={
                  identity.beneficial_owner_observed
                    ? 'quality-good'
                    : 'quality-warn'
                }
              >
                {identity.beneficial_owner_observed
                  ? 'OWNER OBSERVED'
                  : 'OWNER UNPROVEN'}
              </Badge>
              <Badge variant="outline">{data.window.toUpperCase()}</Badge>
            </div>
            <a
              href={`https://robinhoodchain.blockscout.com/address/${data.owner}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Blockscout <ExternalLink />
            </a>
          </section>

          {coverageWarnings.length ? (
            <Alert className="coverage-alert">
              <ShieldQuestion />
              <AlertTitle>请带着覆盖边界阅读</AlertTitle>
              <AlertDescription>
                {coverageWarnings.join('；')}。
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="research-metrics">
            <ResearchMetric
              icon={<CircleDollarSign />}
              label="已知本金"
              value={formatUsd(allocation.known_principal_usdg)}
              note="仅已定价返回仓位"
            />
            <ResearchMetric
              icon={<Layers3 />}
              label="当前受益仓位"
              value={formatNumber(allocation.current_beneficial_positions)}
              note={`${formatNumber(allocation.valued_positions)} fully valued`}
            />
            <ResearchMetric
              icon={<WalletCards />}
              label="观测 custody"
              value={formatNumber(allocation.custody_positions_observed)}
              note="不归因给托管地址"
            />
            <ResearchMetric
              icon={<Blocks />}
              label="索引头"
              value={
                coverage.indexed_head == null
                  ? '—'
                  : `#${formatNumber(coverage.indexed_head)}`
              }
              note={
                coverage.window_complete ? '窗口覆盖完整' : '窗口覆盖不完整'
              }
            />
            <ResearchMetric
              icon={<Timer />}
              label="返回仓位"
              value={formatNumber(coverage.returned_positions)}
              note={
                coverage.possible_position_truncation
                  ? `${formatNumber(coverage.positions_omitted_by_research_limit)} omitted`
                  : '未触及返回上限'
              }
            />
          </section>

          <div className="research-grid">
            <Panel
              className="allocation-table-panel"
              kicker="KNOWN-ONLY ALLOCATION"
              title="池分配"
              action={<span className="panel-count">{pools.length}</span>}
            >
              {pools.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>池</TableHead>
                      <TableHead>协议</TableHead>
                      <TableHead className="text-right">仓位</TableHead>
                      <TableHead className="text-right">已知本金</TableHead>
                      <TableHead className="text-right">占比</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pools.slice(0, 15).map((pool, index) => (
                      <TableRow key={pool.pool_id || String(index)}>
                        <TableCell>
                          <a
                            className="research-pool-link"
                            href={`/pool?id=${encodeURIComponent(pool.pool_id || '')}&owner=${encodeURIComponent(data.owner)}`}
                          >
                            <strong>
                              {pool.pair || shortHash(pool.pool_id)}
                            </strong>
                            <small>{shortHash(pool.pool_id, 8, 5)}</small>
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(pool.protocol || '—').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right mono-cell">
                          {formatNumber(pool.position_count)}
                        </TableCell>
                        <TableCell className="text-right mono-cell">
                          {formatUsd(pool.known_principal_usdg)}
                        </TableCell>
                        <TableCell className="text-right mono-cell">
                          {pool.share_of_known_principal_pct == null
                            ? '—'
                            : `${formatNumber(pool.share_of_known_principal_pct)}%`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState>没有可归因的池分配。</EmptyState>
              )}
            </Panel>

            <Panel
              className="configuration-panel"
              kicker="OBSERVED CONFIGURATION"
              title="配置画像"
              action={<FlaskConical />}
            >
              <MixSection
                title="协议"
                rows={configurations.protocol_mix}
                labelKey="protocol"
              />
              <MixSection
                title="费率模式"
                rows={configurations.fee_mode_mix}
                labelKey="mode"
              />
              <div className="range-summary">
                <p>区间宽度（ticks）</p>
                <dl>
                  <div>
                    <dt>最小</dt>
                    <dd>
                      {formatNumber(configurations.range_width_ticks?.minimum)}
                    </dd>
                  </div>
                  <div>
                    <dt>中位</dt>
                    <dd>
                      {formatNumber(configurations.range_width_ticks?.median)}
                    </dd>
                  </div>
                  <div>
                    <dt>最大</dt>
                    <dd>
                      {formatNumber(configurations.range_width_ticks?.maximum)}
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>

            <Panel
              className="positions-research-panel"
              kicker="RETURNED POSITION SCOPE"
              title="仓位配置"
              action={<span className="panel-count">{positions.length}</span>}
            >
              <ResearchPositions rows={positions} owner={data.owner} />
            </Panel>

            <Panel
              className="lifecycle-panel"
              kicker="PROVISIONAL CURRENT ACTIVITY"
              title="近期生命周期"
              action={<span className="panel-count">{lifecycle.length}</span>}
            >
              {lifecycle.length ? (
                <div className="lifecycle-list">
                  {lifecycle.slice(0, 12).map((item, index) => (
                    <article
                      key={`${item.position_key || 'position'}-${item.kind || 'event'}-${item.timestamp || 'time'}-${index}`}
                    >
                      <span
                        className={cn('life-dot', `is-${item.kind || 'event'}`)}
                      />
                      <div>
                        <strong>
                          {(item.kind || 'event').toUpperCase()} ·{' '}
                          {item.pair || shortHash(item.pool_id)}
                        </strong>
                        <p>{shortHash(item.position_key, 9, 6)}</p>
                      </div>
                      <span>{age(item.timestamp)} 前</span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>没有返回近期生命周期事件。</EmptyState>
              )}
            </Panel>
          </div>

          <section className="limitations-card">
            <ShieldQuestion />
            <div>
              <h2>结论限制</h2>
              <ul>
                {(data.limitations || []).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
            <a
              href={`${API_ORIGIN}/api/v1/research/owner?owner=${encodeURIComponent(data.owner)}&window=${data.window}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              查看原始 JSON <ExternalLink />
            </a>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}

function ResearchMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article>
      <header>
        <span>{icon}</span>
        <p>{label}</p>
      </header>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

type MixRow = {
  protocol?: string | null;
  mode?: string | null;
  returned_positions?: number | null;
  position_count?: number | null;
};

function MixSection({
  title,
  rows,
  labelKey,
}: {
  title: string;
  rows?: MixRow[];
  labelKey: 'protocol' | 'mode';
}) {
  const list = rows || [];
  const maximum = Math.max(
    1,
    ...list.map((item) =>
      Number(item.returned_positions || item.position_count || 0),
    ),
  );
  return (
    <div className="mix-section">
      <p>{title}</p>
      {list.length ? (
        list.map((item, index) => {
          const value = Number(
            item.returned_positions || item.position_count || 0,
          );
          const label = item[labelKey] || 'unknown';
          return (
            <div className="mix-row" key={`${label}-${index}`}>
              <span>{label.toUpperCase()}</span>
              <i>
                <b
                  style={{ width: `${Math.max(4, (value / maximum) * 100)}%` }}
                />
              </i>
              <strong>{formatNumber(value)}</strong>
            </div>
          );
        })
      ) : (
        <small>—</small>
      )}
    </div>
  );
}

function ResearchPositions({
  rows,
  owner,
}: {
  rows: ResearchPosition[];
  owner: string;
}) {
  if (!rows.length) return <EmptyState>没有返回仓位配置。</EmptyState>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>交易对</TableHead>
          <TableHead>协议</TableHead>
          <TableHead>范围</TableHead>
          <TableHead>费率模式</TableHead>
          <TableHead>状态</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, 20).map((row, index) => {
          const range = row.range || {};
          const fee = row.fee || {};
          return (
            <TableRow key={row.position_key || String(index)}>
              <TableCell>
                <a
                  href={`/pool?id=${encodeURIComponent(row.pool_id || '')}&owner=${encodeURIComponent(owner)}`}
                  className="research-pool-link"
                >
                  <strong>{row.pair || '—'}</strong>
                  <small>{shortHash(row.position_key, 8, 5)}</small>
                </a>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {(row.protocol || '—').toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="mono-cell">
                {formatNumber(range.tick_lower)} →{' '}
                {formatNumber(range.tick_upper)}
              </TableCell>
              <TableCell>
                {fee.mode || 'unknown'} ·{' '}
                {fee.current_ppm == null
                  ? '—'
                  : `${Number(fee.current_ppm) / 10_000}%`}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    range.in_range === true ? 'quality-good' : 'quality-warn'
                  }
                >
                  {range.in_range == null
                    ? 'UNKNOWN'
                    : range.in_range
                      ? 'IN RANGE'
                      : 'OUT'}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ResearchSkeleton() {
  return (
    <div className="research-loading">
      <Skeleton className="h-32 w-full bg-white/5" />
      <div>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 bg-white/5" />
        ))}
      </div>
      <Skeleton className="h-96 w-full bg-white/5" />
    </div>
  );
}
