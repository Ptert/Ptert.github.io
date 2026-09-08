'use client';

/* oxlint-disable next/no-html-link-for-pages */

import {
  Activity,
  ArrowUpRight,
  BookOpen,
  FlaskConical,
  GitFork,
  LayoutDashboard,
  SearchCode,
  Waves,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/',
    label: '总览',
    icon: LayoutDashboard,
    match: ['/', '/lp', '/pools'],
  },
  { href: '/pool', label: '池分析', icon: Waves, match: ['/pool'] },
  {
    href: '/research',
    label: '地址研究',
    icon: SearchCode,
    match: ['/research'],
  },
  { href: '/flow', label: '公开资金流', icon: Activity, match: ['/flow'] },
  { href: '/guide', label: 'LP 指南', icon: BookOpen, match: ['/guide'] },
];

type AppShellProps = {
  children: ReactNode;
  activePath: string;
  status?: {
    state?: string | null;
    indexedHead?: number | null;
    lagBlocks?: number | null;
  };
};

export function AppShell({ children, activePath, status }: AppShellProps) {
  const state = String(status?.state || 'connecting').toLowerCase();
  const healthy = state === 'live' || state === 'ok';
  const warning =
    state === 'degraded' || state === 'syncing' || state === 'warming';

  return (
    <div className="app-frame">
      <aside className="side-rail">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>Robinhood Pools</strong>
            <small>链上流动性观测站</small>
          </span>
        </div>

        <nav className="primary-nav" aria-label="主导航">
          <p className="nav-label">工作台</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match.includes(activePath);
            return (
              <a
                key={item.href}
                className={cn('nav-item', active && 'is-active')}
                href={item.href}
                aria-label={item.label}
                title={item.label}
              >
                <Icon />
                <span>{item.label}</span>
                {active ? <i aria-hidden="true" /> : null}
              </a>
            );
          })}
        </nav>

        <div className="rail-spacer" />
        <div className="network-card">
          <div className="network-heading">
            <span
              className={cn(
                'status-orb',
                healthy && 'is-live',
                warning && 'is-warn',
              )}
            />
            <span>
              <strong>Robinhood Chain</strong>
              <small>主网 · Chain 4663</small>
            </span>
          </div>
          <dl>
            <div>
              <dt>索引区块</dt>
              <dd>
                {status?.indexedHead == null
                  ? '—'
                  : `#${status.indexedHead.toLocaleString()}`}
              </dd>
            </div>
            <div>
              <dt>区块差</dt>
              <dd>
                {status?.lagBlocks == null
                  ? '—'
                  : status.lagBlocks.toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
        <a
          className="source-link"
          href="https://github.com/wock9000/robinhoodpools"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="查看 Robinhood Pools 源代码"
          title="查看源代码"
        >
          <GitFork />
          <span>源代码 · AGPL-3.0</span>
          <ArrowUpRight />
        </a>
      </aside>

      <div className="page-column">
        <header className="mobile-header">
          <a className="mobile-brand" href="/">
            <span className="brand-mark">R</span>
            <span>Robinhood Pools</span>
          </a>
          <Badge
            className={cn(
              'top-status',
              healthy && 'is-live',
              warning && 'is-warn',
            )}
            variant="outline"
          >
            <span className="status-orb" />
            {state.toUpperCase()}
          </Badge>
        </header>
        <main className="page-content">{children}</main>
        <nav className="mobile-nav" aria-label="移动端导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.match.includes(activePath);
            return (
              <a
                key={item.href}
                className={cn(active && 'is-active')}
                href={item.href}
              >
                <Icon />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="page-intro">
      <div>
        <p className="eyebrow">
          <FlaskConical />
          {eyebrow}
        </p>
        <h1>{title}</h1>
        <p className="intro-copy">{description}</p>
      </div>
      {actions ? <div className="intro-actions">{actions}</div> : null}
    </section>
  );
}

export function Panel({
  title,
  kicker,
  action,
  children,
  className,
}: {
  title: string;
  kicker?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('data-panel', className)}>
      <header className="panel-header">
        <div>
          {kicker ? <p>{kicker}</p> : null}
          <h2>{title}</h2>
        </div>
        {action ? <div className="panel-action">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}
