import React, { useState, useEffect } from 'react';
import { configAPI } from '../utils/api';

interface TestResult {
  ok: boolean;
  provider: string;
  model: string;
  error?: string;
}

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
];

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4o',
  custom: '',
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
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

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

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === 'anthropic' ? 'sk-ant-...' :
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

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODELS[provider] || 'model-name'}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
          />
          {provider === 'anthropic' && (
            <p className="text-xs text-gray-400 mt-1">
              Options: claude-opus-4-7 · claude-sonnet-4-6 · claude-haiku-4-5-20251001
            </p>
          )}
          {provider === 'openai' && (
            <p className="text-xs text-gray-400 mt-1">
              Options: gpt-4o · gpt-4o-mini · gpt-4-turbo
            </p>
          )}
        </div>

        {/* Base URL — only for custom or openai */}
        {(provider === 'custom' || provider === 'openai') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base URL {provider === 'openai' && <span className="text-gray-400 font-normal">(optional, default: https://api.openai.com)</span>}
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://your-api-endpoint.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
            />
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
    </div>
  );
};

export default Config;
