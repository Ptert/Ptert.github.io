'use client';

/* oxlint-disable next/no-html-link-for-pages */

import {
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  ExternalLink,
  Fingerprint,
  Gauge,
  Layers3,
  Route,
  ShieldAlert,
  Wrench,
} from 'lucide-react';

import { AppShell, PageIntro } from '@/components/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const sections = [
  { id: 'identity', label: '01 · 身份与资产', icon: Fingerprint },
  { id: 'mechanics', label: '02 · 集中流动性', icon: Layers3 },
  { id: 'screen', label: '03 · 筛选池', icon: Gauge },
  { id: 'economics', label: '04 · 收益口径', icon: CircleDollarSign },
  { id: 'hypotheses', label: '05 · 建立假设', icon: Boxes },
  { id: 'coverage', label: '06 · 覆盖与证据', icon: ShieldAlert },
  { id: 'tools', label: '07 · 外部工具', icon: Wrench },
  { id: 'api', label: '08 · API 工作流', icon: Code2 },
];

export function LpGuide() {
  return (
    <AppShell activePath="/guide">
      <PageIntro
        eyebrow="LP FIELD GUIDE · ROBINHOOD CHAIN"
        title="先定义证据，再看收益。"
        description="一份面向实操的 Robinhood Chain LP 研究手册：从资产身份、PoolKey 与区间机制，到费用、覆盖范围和入场前检查。"
        actions={
          <Button
            size="lg"
            onClick={() =>
              document
                .getElementById('checklist')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            入场前清单 <ArrowRight />
          </Button>
        }
      />

      <div className="guide-layout">
        <aside className="guide-toc">
          <p>RUNBOOK</p>
          <nav>
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <a href={`#${section.id}`} key={section.id}>
                  <Icon />
                  <span>{section.label}</span>
                </a>
              );
            })}
          </nav>
          <div>
            <ShieldAlert />
            <p>这是一套验证流程，不是收益承诺或投资建议。</p>
          </div>
        </aside>

        <article className="guide-article">
          <section className="guide-lead">
            <Badge variant="outline">CHAIN ID 4663</Badge>
            <h2>你研究的不是一条曲线，而是一组可验证的合约状态。</h2>
            <p>
              相同的代币简称可能指向不同合约；相同交易对可能有多个费率、协议版本和
              Hook。任何比较都必须固定链、完整地址、Pool
              ID、观察区块和时间窗口。
            </p>
          </section>

          <GuideSection
            id="identity"
            number="01"
            title="身份、网络与资产"
            icon={<Fingerprint />}
          >
            <p>
              Robinhood Chain 主网 Chain ID 为 <code>4663</code>，测试网是{' '}
              <code>46630</code>
              。第一步同时核对钱包网络、浏览器地址和区块浏览器域名。
            </p>
            <div className="guide-grid-3">
              <GuideFact
                title="代币"
                text="记录 token0 / token1 的完整合约地址、decimals 和报价方向；桥接资产在 L2 会有独立地址。"
              />
              <GuideFact
                title="V3 池"
                text="记录池合约、费率、tick spacing、当前 tick 与观察区块，不能只记交易对简称。"
              />
              <GuideFact
                title="V4 池"
                text="记录完整 PoolKey：currency0、currency1、fee、tickSpacing、hooks。PoolManager 不是单池 TVL。"
              />
            </div>
            <SourceLine
              links={[
                [
                  'Robinhood 连接文档',
                  'https://docs.robinhood.com/chain/connecting',
                ],
                ['Blockscout', 'https://robinhoodchain.blockscout.com/'],
                [
                  'V4 PoolKey',
                  'https://github.com/Uniswap/v4-core/blob/main/src/types/PoolKey.sol',
                ],
              ]}
            />
          </GuideSection>

          <GuideSection
            id="mechanics"
            number="02"
            title="集中流动性如何工作"
            icon={<Layers3 />}
          >
            <p>
              V3/V4
              仓位只在现价位于所选区间时赚取交换费。价格越过边界后，仓位变成单边且暂停赚费，回到区间后才恢复。
            </p>
            <figure
              className="mechanic-diagram"
              aria-label="集中流动性价格区间示意"
            >
              <div className="mechanic-axis">
                <span>Token0 only</span>
                <span>ACTIVE RANGE</span>
                <span>Token1 only</span>
              </div>
              <div className="mechanic-track">
                <i />
                <span className="lower">LOWER TICK</span>
                <b>
                  <em>SPOT</em>
                </b>
                <span className="upper">UPPER TICK</span>
              </div>
            </figure>
            <ul className="guide-checks">
              <li>
                <CheckCircle2 /> Tick 是离散价格边界；tick spacing
                限定可初始化边界。
              </li>
              <li>
                <CheckCircle2 />{' '}
                手续费按交换时的活跃流动性份额累计，通常不会自动复投。
              </li>
              <li>
                <CheckCircle2 /> V4 动态费率和 Hook
                可改变费用与记账，不能只看一个当前费率数字。
              </li>
            </ul>
            <SourceLine
              links={[
                [
                  '集中流动性',
                  'https://developers.uniswap.org/docs/get-started/concepts/liquidity-providers/concentrated-liquidity',
                ],
                [
                  '费用机制',
                  'https://developers.uniswap.org/docs/get-started/concepts/fees',
                ],
                [
                  'V4 Hooks',
                  'https://developers.uniswap.org/docs/protocols/v4/concepts/hooks',
                ],
              ]}
            />
          </GuideSection>

          <GuideSection
            id="screen"
            number="03"
            title="用同一口径筛选池"
            icon={<Gauge />}
          >
            <p>
              先固定窗口，再看排名。成交额、手续费、净流入和价格变化必须来自同一池、同一结束时间、同一窗口与估值基准。
            </p>
            <div className="guide-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>字段</th>
                    <th>能回答</th>
                    <th>不能回答</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>TVL</td>
                    <td>快照时已知资产规模</td>
                    <td>未来退出深度或 V4 manager 的单池余额</td>
                  </tr>
                  <tr>
                    <td>成交额 / TVL</td>
                    <td>观测窗口内资金使用强度</td>
                    <td>你的具体区间会赚到多少费</td>
                  </tr>
                  <tr>
                    <td>手续费</td>
                    <td>费率 × 已定价交换的池级估算</td>
                    <td>扣除 Hook、协议分成与 gas 后的净收益</td>
                  </tr>
                  <tr>
                    <td>净流入</td>
                    <td>已定价存入减提取</td>
                    <td>所有事件均已追踪、估值或归属正确</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <a className="guide-cta" href="/?window=24h">
              打开 24H 市场筛选 <ArrowRight />
            </a>
          </GuideSection>

          <GuideSection
            id="economics"
            number="04"
            title="费用、库存损失与净收益"
            icon={<CircleDollarSign />}
          >
            <div className="equation-card">
              <span>LP 净结果</span>
              <strong>
                手续费 + 价格变化 − 库存再平衡损失 − Gas − 协议 / Hook 分成
              </strong>
              <small>每一项都必须固定时间与估值基准；未知项保持未知。</small>
            </div>
            <p>
              可领取手续费是收入，但不自动意味着仓位盈利。应把 LP
              结果与“同样起始资产、按相同时间持有”的反事实比较，并区分 gross
              P/L、gas 和 net P/L。
            </p>
            <p>
              本终端在明确标注处使用 USDG quote：
              <strong>1 USDG = 1 quote dollar</strong>
              。这只是报价基准，不是法币美元预言机，也不消除稳定币、桥、赎回或发行人风险。
            </p>
            <SourceLine
              links={[
                ['LVR 论文', 'https://arxiv.org/abs/2208.06046'],
                ['Paxos USDG', 'https://docs.paxos.com/stablecoin/usdg'],
                ['USDG 储备披露', 'https://www.paxos.com/usdg-transparency'],
              ]}
            />
          </GuideSection>

          <GuideSection
            id="hypotheses"
            number="05"
            title="把仓位写成可证伪假设"
            icon={<Boxes />}
          >
            <div className="hypothesis-list">
              <article>
                <span>01</span>
                <div>
                  <strong>价格假设</strong>
                  <p>
                    预计价格在什么区间、持续多久？什么价格行为会证明判断错误？
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <strong>流量假设</strong>
                  <p>
                    预计同一 Pool ID
                    在选择窗口有多少可持续交换，而不是一次性噪声？
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <strong>成本假设</strong>
                  <p>
                    计划多久调整一次区间，Gas、滑点和再平衡损失是否吞噬手续费？
                  </p>
                </div>
              </article>
              <article>
                <span>04</span>
                <div>
                  <strong>退出假设</strong>
                  <p>
                    合约风险、Hook
                    更新、流动性骤降或价格越界时，明确退出条件是什么？
                  </p>
                </div>
              </article>
            </div>
          </GuideSection>

          <GuideSection
            id="coverage"
            number="06"
            title="索引、覆盖与证据等级"
            icon={<ShieldAlert />}
          >
            <p>
              HTTP 200
              只说明应用能响应，并不证明数据新鲜或完整。每次使用前都检查
              observed head、indexed head、lag、history coverage、provider
              状态和重组提示。
            </p>
            <div className="evidence-levels">
              <div>
                <Badge>STRONGER</Badge>
                <strong>交易 receipt + logs + 固定区块合约读取</strong>
                <p>可复核同一链、同一交易与同一状态。</p>
              </div>
              <div>
                <Badge variant="outline">CONTEXT</Badge>
                <strong>发布者标签、前端聚合、用户名</strong>
                <p>可用于发现线索，不能单独证明路由、所有权或意图。</p>
              </div>
            </div>
            <a
              className="guide-cta"
              href="https://status.rhpools.lol/"
              target="_blank"
              rel="noopener noreferrer"
            >
              查看服务与索引状态 <ExternalLink />
            </a>
          </GuideSection>

          <GuideSection
            id="tools"
            number="07"
            title="外部工具的正确用途"
            icon={<Wrench />}
          >
            <div className="tool-grid">
              <GuideFact
                title="Blockscout"
                text="核对合约、代理实现、角色、交易 receipt、logs 和完整地址；verified source 不是安全认证。"
              />
              <GuideFact
                title="Uniswap Explore"
                text="发现池与比较 TVL、APR、1d/30d 成交额；前端聚合不能替代完整 PoolKey 与 Hook 审查。"
              />
              <GuideFact
                title="CoinGecko / Arbdata"
                text="用于代币或链级宏观交叉检查，不证明某个池的路由、深度或 LP 收益。"
              />
              <GuideFact
                title="Allium / Zerion"
                text="可做带账户的数据核验；先确认 Robinhood mainnet schema 与 DeFi 覆盖，而非仅凭支持列表。"
              />
            </div>
          </GuideSection>

          <GuideSection
            id="api"
            number="08"
            title="用公开 API 复核"
            icon={<Code2 />}
          >
            <p>
              输入完整代币地址，直接打开服务端的 block-pinned 池列表。公开 JSON
              接口允许跨域读取；独立前端应使用有节制的轮询，并在 429 / 503
              时保守退避。
            </p>
            <form
              className="token-api-form"
              action="https://rhpools.lol/api/v1/pools"
              method="get"
              target="_blank"
            >
              <Input
                name="token"
                required
                pattern="0x[0-9a-fA-F]{40}"
                placeholder="0x… token contract"
                aria-label="代币合约地址"
              />
              <Button type="submit">
                查询池 JSON <ExternalLink />
              </Button>
            </form>
            <div className="code-sample">
              <span>GET</span>
              <code>
                https://rhpools.lol/api/v1/pools?token=&#123;TOKEN_ADDRESS&#125;
              </code>
            </div>
            <SourceLine
              links={[
                ['OpenAPI 3.1', 'https://rhpools.lol/api/v1/openapi.json'],
                [
                  '公开 API 文档',
                  'https://github.com/wock9000/robinhoodpools/blob/main/docs/PUBLIC_API.md',
                ],
                ['项目源代码', 'https://github.com/wock9000/robinhoodpools'],
              ]}
            />
          </GuideSection>

          <section className="deposit-checklist" id="checklist">
            <header>
              <span>
                <BookOpen />
              </span>
              <div>
                <p>PRE-DEPOSIT CHECKLIST</p>
                <h2>入场前逐项确认</h2>
              </div>
            </header>
            <ol>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>网络与合约</strong>Chain
                  4663、token0、token1、decimals 与完整 Pool ID 全部匹配。
                </span>
              </li>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>协议与权限</strong>核对 V2/V3/V4、费率、tick
                  spacing、Hook、代理与管理员权限。
                </span>
              </li>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>数据覆盖</strong>索引 lag
                  可接受，所选窗口覆盖完整，未知估值没有被当作 0。
                </span>
              </li>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>区间与压力测试</strong>
                  计算价格越界后的单边资产、退出滑点和多次再平衡成本。
                </span>
              </li>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>收益口径</strong>区分池级手续费、仓位可领取费、gross
                  P/L、gas 与 net P/L。
                </span>
              </li>
              <li>
                <CheckCircle2 />
                <span>
                  <strong>退出计划</strong>
                  写下触发退出的价格、深度、合约或覆盖条件，而不是临场决定。
                </span>
              </li>
            </ol>
          </section>
        </article>
      </div>
    </AppShell>
  );
}

function GuideSection({
  id,
  number,
  title,
  icon,
  children,
}: {
  id: string;
  number: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="guide-section" id={id}>
      <header>
        <span>{icon}</span>
        <div>
          <p>SECTION {number}</p>
          <h2>{title}</h2>
        </div>
      </header>
      <div className="guide-section-body">{children}</div>
    </section>
  );
}

function GuideFact({ title, text }: { title: string; text: string }) {
  return (
    <article className="guide-fact">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function SourceLine({ links }: { links: Array<[string, string]> }) {
  return (
    <div className="source-line">
      <Route />
      <span>参考：</span>
      {links.map(([label, href], index) => (
        <a href={href} target="_blank" rel="noopener noreferrer" key={href}>
          {label}
          <ExternalLink />
          {index < links.length - 1 ? <i>·</i> : null}
        </a>
      ))}
    </div>
  );
}
