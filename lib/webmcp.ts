import type { ProtocolKey, WindowKey } from '@/lib/rhpools-api';

type ToolDefinition = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  execute(input: unknown): unknown;
};

type ModelContext = {
  registerTool(tool: ToolDefinition, options?: { signal?: AbortSignal }): void | Promise<void>;
};

type DocumentWithModelContext = Document & { modelContext?: ModelContext };

const VALID_WINDOWS = new Set<WindowKey>(['1h', '24h', '7d', '30d', 'all']);
const VALID_PROTOCOLS = new Set<ProtocolKey>(['', 'v2', 'v3', 'v4']);

export function registerMarketViewTool(actions: {
  setWindow: (value: WindowKey) => void;
  setProtocol: (value: ProtocolKey) => void;
  setQuery: (value: string) => void;
}) {
  const context = (document as DocumentWithModelContext).modelContext;
  if (!context?.registerTool) return undefined;

  const lifecycle = new AbortController();
  const registration = context.registerTool(
    {
      name: 'configure_pool_market_view',
      title: '筛选 Robinhood Pools 市场',
      description:
        '设置可见市场终端的时间窗口、协议版本和搜索词，用于筛选 Robinhood Chain 流动性池。',
      inputSchema: {
        type: 'object',
        properties: {
          window: {
            type: 'string',
            enum: ['1h', '24h', '7d', '30d', 'all'],
            description: '聚合时间窗口。',
          },
          protocol: {
            type: 'string',
            enum: ['', 'v2', 'v3', 'v4'],
            description: '协议版本；空字符串表示全部。',
          },
          query: {
            type: 'string',
            maxLength: 128,
            description: '交易对、代币、池 ID 或地址搜索词。',
          },
        },
        required: ['window', 'protocol', 'query'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
          throw new TypeError('输入必须是筛选对象。');
        }
        const values = input as Record<string, unknown>;
        const windowValue = values.window as WindowKey;
        const protocolValue = values.protocol as ProtocolKey;
        const queryValue = values.query;
        if (!VALID_WINDOWS.has(windowValue)) throw new RangeError('window 不在支持范围内。');
        if (!VALID_PROTOCOLS.has(protocolValue)) throw new RangeError('protocol 不在支持范围内。');
        if (typeof queryValue !== 'string' || queryValue.length > 128) {
          throw new RangeError('query 必须是长度不超过 128 的字符串。');
        }

        actions.setWindow(windowValue);
        actions.setProtocol(protocolValue);
        actions.setQuery(queryValue);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        return {
          view: 'pool-market',
          window: windowValue,
          protocol: protocolValue || 'all',
          query: queryValue,
          status: 'filters-applied',
        };
      },
    },
    { signal: lifecycle.signal },
  );

  void Promise.resolve(registration).catch(() => undefined);
  return () => lifecycle.abort();
}
