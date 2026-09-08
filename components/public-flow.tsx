'use client';

/* oxlint-disable react/react-compiler */

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Radio,
  RefreshCw,
  ShieldAlert,
  Users,
  Waves,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AppShell, EmptyState, PageIntro, Panel } from '@/components/app-shell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  api,
  describeError,
  type FlowItem,
  type FlowResponse,
  type Status,
} from '@/lib/rhpools-api';
import { cn } from '@/lib/utils';

type Source = 'apollo' | 'rhtrenches';
type Chain = '' | 'solana' | 'base' | 'robinhood';

export function PublicFlow() {
  const [source, setSource] = useState<Source>('rhtrenches');
  const [chain, setChain] = useState<Chain>('robinhood');
  const [verified, setVerified] = useState(false);
  const [limit, setLimit] = useState(25);
  const [cursor, setCursor] = useState<string | undefined>();
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>(
    [],
  );
  const [data, setData] = useState<FlowResponse | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRead, setLastRead] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  const queryKeyRef = useRef('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSource = params.get('source') as Source | null;
    const initialChain = params.get('chain') as Chain | null;
    const initialVerified = params.get('verified') === 'true';
    const initialLimit = Number(params.get('limit'));
    if (initialSource === 'apollo' || initialSource === 'rhtrenches')
      setSource(initialSource);
    if (['', 'solana', 'base', 'robinhood'].includes(initialChain || ''))
      setChain(initialChain || '');
    setVerified(initialVerified);
    if ([25, 50, 100].includes(initialLimit)) setLimit(initialLimit);
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (source === 'rhtrenches') {
      setChain('robinhood');
      setVerified(false);
      setCursor(undefined);
      setCursorHistory([]);
    }
  }, [source, initialized]);

  const load = useCallback(
    async (quiet = false) => {
      const request = ++requestRef.current;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      const normalizedChain = source === 'rhtrenches' ? 'robinhood' : chain;
      const queryKey = `${source}:${normalizedChain}:${verified}:${limit}:${cursor || ''}`;
      if (!quiet) {
        setLoading(true);
        if (queryKeyRef.current !== queryKey) setData(null);
      }
      queryKeyRef.current = queryKey;
      try {
        const [flowResult, statusResult] = await Promise.allSettled([
          api.flow(
            {
              source,
              chain: normalizedChain,
              verified: source === 'apollo' ? verified : false,
              limit,
              cursor: source === 'apollo' ? cursor : undefined,
            },
            controller.signal,
          ),
          api.status(controller.signal),
        ]);
        if (request !== requestRef.current || controller.signal.aborted) return;
        if (flowResult.status === 'fulfilled') {
          setData(flowResult.value);
          setError(
            statusResult.status === 'rejected'
              ? '资金流已更新，但索引健康状态暂时不可用。'
              : null,
          );
          setLastRead(Date.now());
          const params = new URLSearchParams({
            source,
            verified: String(source === 'apollo' ? verified : false),
            limit: String(limit),
          });
          if (normalizedChain) params.set('chain', normalizedChain);
          window.history.replaceState(null, '', `/flow?${params}`);
        } else {
          setError(describeError(flowResult.reason));
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
    [source, chain, verified, limit, cursor],
  );

  useEffect(() => {
    if (!initialized) return;
    let stopped = false;
    let timer: number | undefined;

    const schedule = (delay = 15_000) => {
      if (stopped || cursor) return;
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (stopped) return;
        if (controllerRef.current) {
          schedule();
          return;
        }
        if (!document.hidden && navigator.onLine) await load(true);
        schedule();
      }, delay);
    };

    const resume = () => {
      if (
        !document.hidden &&
        navigator.onLine &&
        !cursor &&
        !controllerRef.current
      )
        schedule(0);
    };

    void load(false).finally(() => schedule());
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
      controllerRef.current?.abort();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
    };
  }, [load, cursor, initialized]);

  const goOlder = () => {
    if (!data?.next_cursor || source !== 'apollo') return;
    setCursorHistory((history) => [...history, cursor]);
    setCursor(data.next_cursor || undefined);
  };

  const goNewer = () => {
    if (!cursorHistory.length) return;
    const history = [...cursorHistory];
    const previous = history.pop();
    setCursorHistory(history);
    setCursor(previous);
  };

  const items = data?.items || [];
  const coverage = data?.coverage || {};
  const provenance = data?.provenance || {};
  const omitted =
    coverage.rows_omitted && typeof coverage.rows_omitted === 'object'
      ? Object.entries(coverage.rows_omitted as Record<string, number>).reduce(
          (sum, [, value]) => sum + Number(value || 0),
          0,
        )
      : 0;

  return (
    <AppShell
      activePath="/flow"
      status={{
        state: status?.state,
        indexedHead: status?.indexed_head,
        lagBlocks: status?.lag_blocks,
      }}
    >
      <PageIntro
        eyebrow="PUBLIC FLOW · ATTRIBUTED OBSERVATIONS"
        title="公开资金流，保留证据边界。"
        description="读取 Apollo 与 RH Trenches 的匿名公开页面。每条记录保留发布者、链、观察身份和交易证据，但不把它自动归因到某个 LP 池。"
        actions={
          <Button
            variant="outline"
            size="lg"
            onClick={() => void load(false)}
            disabled={loading}
          >
            <RefreshCw className={cn(loading && 'animate-spin')} />
            刷新
          </Button>
        }
      />

      <section className="flow-filters">
        <label htmlFor="flow-source">
          <span>发布源</span>
          <NativeSelect
            id="flow-source"
            value={source}
            onChange={(event) => setSource(event.target.value as Source)}
          >
            <NativeSelectOption value="rhtrenches">
              RH Trenches
            </NativeSelectOption>
            <NativeSelectOption value="apollo">Apollo</NativeSelectOption>
          </NativeSelect>
        </label>
        <label htmlFor="flow-chain">
          <span>链</span>
          <NativeSelect
            id="flow-chain"
            value={source === 'rhtrenches' ? 'robinhood' : chain}
            onChange={(event) => {
              setChain(event.target.value as Chain);
              setCursor(undefined);
              setCursorHistory([]);
            }}
            disabled={source === 'rhtrenches'}
          >
            <NativeSelectOption value="">支持的全部链</NativeSelectOption>
            <NativeSelectOption value="robinhood">Robinhood</NativeSelectOption>
            <NativeSelectOption value="base">Base</NativeSelectOption>
            <NativeSelectOption value="solana">Solana</NativeSelectOption>
          </NativeSelect>
        </label>
        <label htmlFor="flow-identity">
          <span>身份</span>
          <NativeSelect
            id="flow-identity"
            value={verified ? 'true' : 'false'}
            onChange={(event) => {
              setVerified(event.target.value === 'true');
              setCursor(undefined);
              setCursorHistory([]);
            }}
            disabled={source === 'rhtrenches'}
          >
            <NativeSelectOption value="false">全部公开身份</NativeSelectOption>
            <NativeSelectOption value="true">
              仅 verified Fomo
            </NativeSelectOption>
          </NativeSelect>
        </label>
        <label htmlFor="flow-limit">
          <span>每页</span>
          <NativeSelect
            id="flow-limit"
            value={String(limit)}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setCursor(undefined);
              setCursorHistory([]);
            }}
          >
            <NativeSelectOption value="25">25 条</NativeSelectOption>
            <NativeSelectOption value="50">50 条</NativeSelectOption>
            <NativeSelectOption value="100">100 条</NativeSelectOption>
          </NativeSelect>
        </label>
        <div className="flow-live">
          <span className="status-orb is-live" />
          <span>
            <small>15 秒轮询</small>
            <strong>{lastRead ? `${age(lastRead)} 前读取` : '正在连接'}</strong>
          </span>
        </div>
      </section>

      {error ? (
        <Alert className="terminal-alert">
          <AlertTriangle />
          <AlertTitle>发布源暂时不可用</AlertTitle>
          <AlertDescription>
            {error}；当前页面若有数据，将保留最近一次成功读取。
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="flow-source-card">
        <span className="flow-source-icon">
          {source === 'apollo' ? <Waves /> : <Radio />}
        </span>
        <div>
          <p>CURRENT PUBLISHER</p>
          <h2>
            {String(
              provenance.publisher ||
                (source === 'apollo' ? 'Apollo' : 'RH Trenches'),
            )}
          </h2>
          <span>
            {String(provenance.access || 'anonymous-public-read')} ·{' '}
            {String(
              provenance.evidence_time_basis || 'publisher evidence time',
            )}
          </span>
        </div>
        <dl>
          <div>
            <dt>返回</dt>
            <dd>{formatNumber(coverage.returned_items)}</dd>
          </div>
          <div>
            <dt>源页面</dt>
            <dd>{formatNumber(coverage.upstream_page_items)}</dd>
          </div>
          <div>
            <dt>省略</dt>
            <dd>{formatNumber(omitted)}</dd>
          </div>
          <div>
            <dt>证据截至</dt>
            <dd>
              {data?.evidence_through
                ? `${age(data.evidence_through)} 前`
                : '—'}
            </dd>
          </div>
        </dl>
      </section>

      <Panel
        className="flow-table-panel"
        kicker="ONE BOUNDED PUBLISHER PAGE"
        title="观测记录"
        action={
          <div className="flow-pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={goNewer}
              disabled={!cursorHistory.length}
            >
              <ArrowLeft />
              较新
            </Button>
            <span>PAGE {cursorHistory.length + 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={goOlder}
              disabled={source !== 'apollo' || !data?.next_cursor}
            >
              较旧
              <ArrowRight />
            </Button>
          </div>
        }
      >
        {loading && !data ? (
          <FlowLoading />
        ) : items.length ? (
          <FlowTable items={items} />
        ) : (
          <EmptyState>
            这个发布源页面没有返回符合当前链筛选的记录。Apollo
            的单页筛选后可能为空，可继续读取较旧页面。
          </EmptyState>
        )}
        <footer className="panel-footer">
          <span>
            {String(coverage.identity_scope || 'publisher identities')}
          </span>
          <span>{String(coverage.cursor_scope || 'bounded current page')}</span>
        </footer>
      </Panel>

      <div className="flow-notes">
        <article>
          <ShieldAlert />
          <div>
            <strong>没有池路由归因</strong>
            <p>
              {String(
                coverage.pool_attribution?.reason ||
                  '公开源没有提供经过批准的同交易精确池路由。',
              )}
            </p>
          </div>
        </article>
        <article>
          <Users />
          <div>
            <strong>身份不是意图</strong>
            <p>
              用户名、钱包标签和 published side
              是发布者观察，不证明受益所有权、交易动机或未来动作。
            </p>
          </div>
        </article>
        <article>
          <CheckCircle2 />
          <div>
            <strong>逐笔复核</strong>
            <p>
              Robinhood Chain 记录可以通过交易哈希在 Blockscout 核对 receipt 与
              logs。
            </p>
          </div>
        </article>
      </div>
    </AppShell>
  );
}

function FlowTable({ items }: { items: FlowItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>时间</TableHead>
          <TableHead>动作 / 资产</TableHead>
          <TableHead>发布身份</TableHead>
          <TableHead className="text-right">规模</TableHead>
          <TableHead className="text-right">成交价</TableHead>
          <TableHead>证据</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => {
          const action = String(item.action || 'observed').toLowerCase();
          const isBuy = action === 'buy';
          const isSell = action === 'sell';
          const tx = item.source?.transaction_hash;
          const chain = item.asset?.chain || '—';
          const explorer =
            chain === 'solana'
              ? 'https://solscan.io/tx/'
              : chain === 'base'
                ? 'https://basescan.org/tx/'
                : 'https://robinhoodchain.blockscout.com/tx/';
          return (
            <TableRow
              key={item.canonical_action_id || item.source_event_id || index}
            >
              <TableCell>
                <span className="flow-time">
                  <strong>
                    {item.evidence?.occurred_at
                      ? `${age(item.evidence.occurred_at)} 前`
                      : '—'}
                  </strong>
                  <small>{String(chain).toUpperCase()}</small>
                </span>
              </TableCell>
              <TableCell>
                <div className="flow-asset">
                  <span
                    className={cn(
                      'flow-action-icon',
                      isBuy && 'is-buy',
                      isSell && 'is-sell',
                    )}
                  >
                    {isBuy ? (
                      <ArrowDownLeft />
                    ) : isSell ? (
                      <ArrowUpRight />
                    ) : (
                      <Radio />
                    )}
                  </span>
                  <span>
                    <strong>
                      {action.toUpperCase()} ·{' '}
                      {item.asset?.symbol || shortHash(item.asset?.address)}
                    </strong>
                    <small>
                      {item.asset?.name || shortHash(item.asset?.address, 8, 5)}
                    </small>
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="flow-identity">
                  <strong>
                    {item.identity?.handle ||
                      shortHash(item.identity?.wallet, 8, 5)}
                  </strong>
                  <small>{item.identity?.kind || 'published identity'}</small>
                </span>
              </TableCell>
              <TableCell
                className="text-right mono-cell strong-cell"
                title={String(
                  item.economics?.value_basis || 'publisher-reported value',
                )}
              >
                {formatUsd(item.economics?.trade_size_usd, false)}
              </TableCell>
              <TableCell
                className="text-right mono-cell"
                title={String(
                  item.economics?.value_basis || 'publisher-reported value',
                )}
              >
                {formatUsd(item.economics?.leader_fill_price_usd, false)}
              </TableCell>
              <TableCell>
                {tx ? (
                  <a
                    className="evidence-link"
                    href={`${explorer}${tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {shortHash(tx, 7, 5)}
                    <ExternalLink />
                  </a>
                ) : (
                  <Badge variant="outline">PUBLISHER ONLY</Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function FlowLoading() {
  return (
    <div className="table-loading">
      {Array.from({ length: 8 }, (_, row) => (
        <div
          key={row}
          style={{ gridTemplateColumns: 'repeat(6, minmax(100px, 1fr))' }}
        >
          {Array.from({ length: 6 }, (__, column) => (
            <Skeleton key={column} className="h-4 w-4/5 bg-white/5" />
          ))}
        </div>
      ))}
    </div>
  );
}
