import React, { useState, useEffect } from 'react';
import { configAPI } from '../utils/api';

interface TestResult {
  ok: boolean;
  provider: string;
  model: string;
  error?: string;
}

const PROVIDERS = [
  { value: 'claude_code', label: 'Claude Code (trên máy này)' },
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
  { value: 'custom_claude', label: 'Custom (Claude-compatible)' },
];

const DEFAULT_MODELS: Record<string, string> = {
  claude_code: '',
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  custom: '',
  custom_claude: 'claude-sonnet-4-6',
};

const TEAM_FIELDS: { key: 'backend' | 'web' | 'mobile' | 'qa'; label: string; icon: string }[] = [
  { key: 'backend', label: 'Backend', icon: '🗄️' },
  { key: 'web', label: 'Web', icon: '🌐' },
  { key: 'mobile', label: 'Mobile', icon: '📱' },
  { key: 'qa', label: 'QA', icon: '🔍' },
];

const TeamCapacityConfig: React.FC = () => {
  const [capacity, setCapacity] = useState<Record<string, number>>({ backend: 0, web: 0, mobile: 0, qa: 0 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    configAPI.getTeamCapacity().then((res) => {
      const c = res.data || {};
      setCapacity({
        backend: Number(c.backend) || 0,
        web: Number(c.web) || 0,
        mobile: Number(c.mobile) || 0,
        qa: Number(c.qa) || 0,
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await configAPI.saveTeamCapacity({
        backend: capacity.backend,
        web: capacity.web,
        mobile: capacity.mobile,
        qa: capacity.qa,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-5 mt-6">
      <div className="border-b pb-2">
        <h2 className="text-lg font-semibold text-gray-800">Team Capacity</h2>
        <p className="text-xs text-gray-400 mt-1">Số story point tối đa của mỗi team trong 1 sprint. Dùng để tính % tải của ticket ở trang Sprint Management.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TEAM_FIELDS.map((t) => (
          <div key={t.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.icon} {t.label} <span className="text-gray-400 font-normal">(SP / sprint)</span>
            </label>
            <input
              type="number"
              min={0}
              value={capacity[t.key]}
              onChange={(e) => setCapacity((prev) => ({ ...prev, [t.key]: Number(e.target.value) }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <span className="text-green-600 text-sm">✓ Saved</span>}
        {error && <span className="text-red-600 text-sm">✗ {error}</span>}
      </div>
    </div>
  );
};

interface AiPrompt {
  id: string;
  name: string;
  usedIn: string;
  source: string;
  content: string;
}

/** Xem prompt AI đang chạy — chỉ đọc, muốn sửa thì sửa file nguồn được ghi kèm. */
const AiPromptsPanel: React.FC = () => {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');
  const [copiedId, setCopiedId] = useState('');

  useEffect(() => {
    configAPI
      .getAIPrompts()
      .then((res) => setPrompts((res.data.data as AiPrompt[]) || []))
      .catch((err: any) => setError(err?.response?.data?.error || err?.message || 'Không tải được prompt'))
      .finally(() => setLoading(false));
  }, []);

  const copy = async (prompt: AiPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(''), 1500);
    } catch {
      setError('Trình duyệt chặn clipboard');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Prompt AI đang dùng</h2>
        <p className="mt-2 text-xs text-gray-500">
          Prompt nằm trong code nên chỉ xem ở đây; sửa thì sửa file nguồn ghi kèm rồi restart server.
        </p>
      </div>

      {loading ? (
        <div className="h-20 animate-pulse rounded bg-gray-50" />
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <div className="space-y-3">
          {prompts.map((prompt) => {
            const open = openId === prompt.id;
            return (
              <div key={prompt.id} className="rounded-md border border-gray-200">
                <div className="flex items-start justify-between gap-3 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? '' : prompt.id)}
                    className="flex-1 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <span className="text-gray-400">{open ? '▾' : '▸'}</span>
                      {prompt.name}
                    </span>
                    <span className="mt-1 block pl-5 text-xs text-gray-500">Dùng ở: {prompt.usedIn}</span>
                    <code className="mt-0.5 block pl-5 text-[11px] text-gray-400">{prompt.source}</code>
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(prompt)}
                    className="shrink-0 rounded border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {copiedId === prompt.id ? '✓ Đã copy' : 'Copy'}
                  </button>
                </div>

                {open && (
                  <pre className="max-h-96 overflow-auto border-t border-gray-100 bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {prompt.content}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Config: React.FC = () => {
  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    configAPI.getAI().then((res) => {
      const c = res.data;
      if (c?.provider) setProvider(c.provider);
      if (c?.apiKey) setApiKey(c.apiKey);
      if (c?.model) setModel(c.model);
      if (c?.baseUrl) setBaseUrl(c.baseUrl);
    });
  }, []);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    setModel(DEFAULT_MODELS[p] || '');
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (provider === 'custom_claude' && !baseUrl.trim()) {
        throw new Error('Base URL is required for Custom Claude-compatible provider');
      }
      await configAPI.saveAI({ provider, apiKey, model, baseUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">AI Configuration</h2>

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {provider === 'claude_code' && (
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 space-y-1">
            <p>
              Gọi lệnh <code className="font-mono">claude -p</code> trên máy đang chạy backend, dùng tài khoản Claude Code đã
              đăng nhập sẵn — <b>không cần API key</b>.
            </p>
            <p className="text-blue-700">
              Chạy trong thư mục tạm, chỉ được dùng tool Read (để xem ảnh đính kèm). Không tìm thấy lệnh thì đặt
              <code className="font-mono"> CLAUDE_CODE_BIN</code> trong .env.
            </p>
          </div>
        )}

        {/* API Key */}
        {provider !== 'claude_code' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === 'anthropic' || provider === 'custom_claude' ? 'sk-ant-...' :
                provider === 'openai' ? 'sk-...' : 'API Key'
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        )}

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={provider === 'claude_code' ? 'để trống = model mặc định của Claude Code' : DEFAULT_MODELS[provider] || 'model-name'}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
          />
          {provider === 'claude_code' && (
            <p className="text-xs text-gray-400 mt-1">
              Alias của Claude Code: opus · sonnet · haiku, hoặc tên model đầy đủ.
            </p>
          )}
          {provider === 'anthropic' && (
            <p className="text-xs text-gray-400 mt-1">
              Options: claude-opus-4-7 · claude-sonnet-4-6 · claude-haiku-4-5-20251001
            </p>
          )}
          {provider === 'custom_claude' && (
            <p className="text-xs text-gray-400 mt-1">
              Use a model name supported by your Claude-compatible endpoint.
            </p>
          )}
          {provider === 'openai' && (
            <p className="text-xs text-gray-400 mt-1">
              Options: gpt-4o · gpt-4o-mini · gpt-4-turbo
            </p>
          )}
        </div>

        {/* Base URL — only for custom providers or openai */}
        {(provider === 'custom' || provider === 'custom_claude' || provider === 'openai') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL {provider === 'openai' && <span className="text-gray-400 font-normal">(optional, default: https://api.openai.com)</span>}
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={provider === 'custom_claude' ? 'https://your-claude-compatible-endpoint.com' : 'https://your-api-endpoint.com'}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
            />
            {provider === 'custom_claude' && (
              <p className="text-xs text-gray-400 mt-1">
                Endpoint must support Anthropic Messages API paths such as /v1/messages.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={async () => {
              setTesting(true);
              setTestResult(null);
              try {
                const res = await configAPI.testAI();
                setTestResult(res.data);
              } catch (err: any) {
                setTestResult({ ok: false, provider: '', model: '', error: err?.response?.data?.error || err?.message });
              } finally {
                setTesting(false);
              }
            }}
            disabled={testing}
            className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {saved && <span className="text-green-600 text-sm">✓ Saved</span>}
          {error && <span className="text-red-600 text-sm">✗ {error}</span>}
        </div>

        {testResult && (
          <div className={`text-sm px-3 py-2 rounded ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {testResult.ok
              ? `✓ Connected — ${testResult.provider} / ${testResult.model}`
              : `✗ ${testResult.error}`}
          </div>
        )}
      </div>

      <TeamCapacityConfig />
      </div>

      <AiPromptsPanel />
      </div>
    </div>
  );
};

export default Config;
