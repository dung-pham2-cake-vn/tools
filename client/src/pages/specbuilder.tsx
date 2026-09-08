import React, { useCallback, useEffect, useMemo, useState } from 'react';

type Model = 'native' | 'dop' | 'collection';
type Product = 'cashloan' | 'payday' | 'paylater';
type DisburseMode = 'partner_callback' | 'external_bank' | 'cake_account' | 'none';
type RepaymentMode = 'van' | 'request_confirm' | 'both' | 'none';

interface ChangelogEntry {
  date: string;
  email_title?: string;
  note: string;
}

interface Manifest {
  partner: { dir: string; display?: string; title?: string; product_id?: string; group?: string };
  model: Model;
  product?: Product;
  onboarding: {
    enabled: boolean;
    challenge_otp: boolean;
    challenge_facematch: boolean;
    get_status: boolean;
    data_config: boolean;
  };
  contract: { enabled: boolean; cancel: boolean };
  loan_detail: { api: boolean; webview: boolean };
  disburse: { mode: DisburseMode; status_query: boolean };
  repayment: { mode: RepaymentMode; status: boolean; partner_callback: boolean };
  termination: boolean;
  payment: boolean;
  installment: boolean;
  callbacks: { update_status: boolean };
  custom_fragments: string[];
  changelog: { email_title: string; entries: ChangelogEntry[] };
}

interface Meta {
  products: Product[];
  partners: string[];
  fragments: string[];
}

const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

const EMPTY: Manifest = {
  partner: { dir: '', display: '', product_id: '', group: 'cashloan' },
  model: 'native',
  product: 'cashloan',
  onboarding: { enabled: true, challenge_otp: false, challenge_facematch: false, get_status: false, data_config: true },
  contract: { enabled: true, cancel: true },
  loan_detail: { api: true, webview: false },
  disburse: { mode: 'partner_callback', status_query: false },
  repayment: { mode: 'van', status: true, partner_callback: false },
  termination: false,
  payment: false,
  installment: false,
  callbacks: { update_status: true },
  custom_fragments: [],
  changelog: { email_title: '', entries: [{ date: today(), note: 'Khởi tạo tài liệu' }] },
};

// ── UI primitives ────────────────────────────────────────────────
const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title, hint, children,
}) => (
  <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
    <legend className="px-2 text-sm font-semibold text-slate-700">{title}</legend>
    {hint && <p className="-mt-1 mb-3 text-xs text-slate-500">{hint}</p>}
    <div className="space-y-3">{children}</div>
  </fieldset>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label, hint, children,
}) => (
  <label className="block">
    <span className="block text-xs font-medium text-slate-600">{label}</span>
    {children}
    {hint && <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>}
  </label>
);

const Text: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
  />
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select
    {...props}
    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
  />
);

const Check: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }> = ({
  checked, onChange, label, hint, disabled,
}) => (
  <label className={`flex items-start gap-2 ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
    />
    <span className="text-sm text-slate-700">
      {label}
      {hint && <span className="ml-1 text-[11px] text-slate-400">— {hint}</span>}
    </span>
  </label>
);

// ── page ─────────────────────────────────────────────────────────
const SpecBuilderPage: React.FC = () => {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [m, setM] = useState<Manifest>(EMPTY);
  const [yamlOut, setYamlOut] = useState('');
  const [paths, setPaths] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string[] | null>(null);

  const set = <K extends keyof Manifest>(k: K, v: Manifest[K]) => setM((p) => ({ ...p, [k]: v }));
  const sub = <K extends keyof Manifest>(k: K, patch: Partial<Manifest[K]>) =>
    setM((p) => ({ ...p, [k]: { ...(p[k] as object), ...patch } as Manifest[K] }));

  useEffect(() => {
    fetch('/api/specbuilder/meta')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setMeta)
      .catch((e) => setError(e.message));
  }, []);

  const isDop = m.model === 'dop';
  const isCollection = m.model === 'collection';

  const build = useCallback(async (save: boolean) => {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const r = await fetch('/api/specbuilder/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest: m, save }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setYamlOut(d.yaml);
      setPaths(d.paths || []);
      setWarnings(d.warnings || []);
      if (save) setSaved(d.written || []);
    } catch (e: any) {
      setError(e.message);
      setYamlOut('');
      setPaths([]);
    } finally {
      setBusy(false);
    }
  }, [m]);

  const loadManifest = async (dir: string) => {
    if (!dir) return;
    setError(null);
    try {
      const r = await fetch(`/api/specbuilder/manifest?dir=${encodeURIComponent(dir)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setM({ ...EMPTY, ...d.manifest });
    } catch (e: any) {
      setError(`${e.message} — partner này chưa build bằng tool, nhập tay rồi Save để tạo manifest`);
    }
  };

  const download = () => {
    const blob = new Blob([yamlOut], { type: 'text/yaml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${m.partner.dir || 'spec'}.index.yaml`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const grouped = useMemo(() => {
    const g: Record<string, string[]> = { Partner: [], Cake: [] };
    paths.forEach((p) => g[p.startsWith('/partner-') ? 'Cake' : 'Partner'].push(p));
    return g;
  }, [paths]);

  return (
    <div className="-m-8 flex h-screen flex-col overflow-hidden bg-slate-50">
      <header className="flex flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="whitespace-nowrap text-lg font-semibold text-slate-800">🏗️ Spec Builder</h1>
        <span className="truncate text-sm text-slate-500">
          base2 superset + manifest → <code className="text-xs">specs/&lt;partner&gt;/index.yaml</code>
        </span>
        <div className="ml-auto flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => build(false)}
            disabled={busy}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-50"
          >
            {busy ? '…' : '▶ Preview'}
          </button>
          <button
            onClick={download}
            disabled={!yamlOut}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40"
          >
            ⬇ Download
          </button>
          <button
            onClick={() => build(true)}
            disabled={busy || !m.partner.dir}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            💾 Save vào specs/
          </button>
        </div>
      </header>

      {(error || warnings.length > 0 || saved) && (
        <div className="flex-shrink-0 space-y-1 border-b border-slate-200 bg-white px-6 py-2 text-sm">
          {error && <p className="text-red-600">✗ {error}</p>}
          {warnings.map((w) => <p key={w} className="text-amber-600">⚠ {w}</p>)}
          {saved && (
            <p className="text-green-700">
              ✓ đã ghi {saved.join(', ')} — chạy{' '}
              <code className="text-xs">node open_api_viewer/build-specs-index.mjs</code> để viewer thấy bản mới
            </p>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* ── form ── */}
        <div className="w-[460px] flex-shrink-0 space-y-4 overflow-y-auto border-r border-slate-200 p-4">
          <Section title="Partner">
            <Field label="Nạp manifest có sẵn">
              <Select value="" onChange={(e) => loadManifest(e.target.value)}>
                <option value="">— chọn partner để nạp lại cấu hình —</option>
                {(meta?.partners || []).map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field label="Thư mục spec *" hint="specs/<dir>/index.yaml — chữ thường, số, _ hoặc -">
              <Text
                value={m.partner.dir}
                placeholder="kov_cashloan"
                onChange={(e) => sub('partner', { dir: e.target.value.trim() })}
              />
            </Field>
            <Field label="product_id" hint="để trống thì giữ placeholder `product_id`">
              <Text
                value={m.partner.product_id || ''}
                placeholder="KOV_cashloan"
                onChange={(e) => sub('partner', { product_id: e.target.value.trim() })}
              />
            </Field>
            <Field label="info.title" hint="để trống thì tự sinh từ product_id + mô hình">
              <Text
                value={m.partner.title || ''}
                placeholder="KOV_cashloan - Native Lending APIs"
                onChange={(e) => sub('partner', { title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mô hình">
                <Select value={m.model} onChange={(e) => set('model', e.target.value as Model)}>
                  <option value="native">Native</option>
                  <option value="dop">DOP (webview)</option>
                  <option value="collection">Collection Reminder</option>
                </Select>
              </Field>
              <Field label="Sản phẩm">
                <Select
                  value={m.product}
                  disabled={isCollection}
                  onChange={(e) => set('product', e.target.value as Product)}
                >
                  {(meta?.products || ['cashloan', 'payday', 'paylater']).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="group (biến server URL)" hint="/ext/loan/{group}/{product_id}">
              <Select value={m.partner.group} onChange={(e) => sub('partner', { group: e.target.value })}>
                <option value="cashloan">cashloan</option>
                <option value="payday">payday</option>
                <option value="paylater">paylater</option>
              </Select>
            </Field>
          </Section>

          {!isCollection && (
            <>
              <Section
                title="Onboarding"
                hint={isDop ? 'DOP: KH onboarding trong webview Cake, không có API eKYC' : undefined}
              >
                <Check
                  checked={m.onboarding.enabled}
                  onChange={(v) => sub('onboarding', { enabled: v })}
                  label={isDop ? 'generate-webview/onboarding' : 'check-profile → client-create → client-update → loan-register'}
                />
                {!isDop && (
                  <>
                    <Check
                      checked={m.onboarding.data_config}
                      onChange={(v) => sub('onboarding', { data_config: v })}
                      label="data-config"
                      hint="value list cho form; bắt buộc nếu giải ngân bank ngoài"
                      disabled={!m.onboarding.enabled}
                    />
                    <Check
                      checked={m.onboarding.get_status}
                      onChange={(v) => sub('onboarding', { get_status: v })}
                      label="get-status"
                      hint="poll trạng thái eKYC"
                      disabled={!m.onboarding.enabled}
                    />
                  </>
                )}
                <Check
                  checked={m.onboarding.challenge_otp}
                  onChange={(v) => sub('onboarding', { challenge_otp: v })}
                  label="2 API challenge OTP"
                  hint="challenge-get-otp + challenge-verify-otp"
                />
                <Check
                  checked={m.onboarding.challenge_facematch}
                  onChange={(v) => sub('onboarding', { challenge_facematch: v })}
                  label="challenge-facematch"
                />
              </Section>

              {!isDop && (
                <Section title="Hợp đồng">
                  <Check
                    checked={m.contract.enabled}
                    onChange={(v) => sub('contract', { enabled: v })}
                    label="get-esign → get-otp → verify-esign"
                  />
                  <Check
                    checked={m.contract.cancel}
                    onChange={(v) => sub('contract', { cancel: v })}
                    label="contract-cancel"
                    disabled={!m.contract.enabled}
                  />
                </Section>
              )}

              <Section title="Chi tiết khoản vay">
                <Check
                  checked={m.loan_detail.api}
                  onChange={(v) => sub('loan_detail', { api: v })}
                  label="get-loan-detail (API)"
                />
                <Check
                  checked={m.loan_detail.webview}
                  onChange={(v) => sub('loan_detail', { webview: v })}
                  label="generate-webview/loan-detail"
                  hint={isDop ? 'webview màn chi tiết' : 'chỉ có ở mô hình DOP'}
                  disabled={!isDop}
                />
              </Section>

              <Section title="Giải ngân">
                <Field label="Hình thức">
                  <Select
                    value={m.disburse.mode}
                    onChange={(e) => sub('disburse', { mode: e.target.value as DisburseMode })}
                  >
                    <option value="partner_callback">Partner giải ngân — partner-disburse-request + disburse-update</option>
                    <option value="external_bank">Bank ngoài (bank-*) — Cake giải ngân vào TK KH</option>
                    <option value="cake_account">Vào TK Cake — không cần endpoint riêng</option>
                    <option value="none">Không có giải ngân</option>
                  </Select>
                </Field>
                {m.disburse.mode === 'external_bank' && (
                  <p className="rounded bg-blue-50 px-2 py-1.5 text-[11px] text-blue-800">
                    Thêm 3 field <code>partner_bank_&#123;code,short_name,account&#125;_disbursement</code> vào{' '}
                    <code>client-create.metadata</code> và <code>bank[]</code> vào <code>data-config</code>.
                    Partner không expose endpoint giải ngân nào.
                  </p>
                )}
                <Check
                  checked={m.disburse.status_query}
                  onChange={(v) => sub('disburse', { status_query: v })}
                  label="partner-disburse-status"
                  hint="Cake truy vấn trạng thái giải ngân từ partner"
                  disabled={m.disburse.mode !== 'partner_callback'}
                />
              </Section>

              <Section title="Thanh toán kỳ hạn">
                <Field label="Luồng">
                  <Select
                    value={m.repayment.mode}
                    onChange={(e) => sub('repayment', { mode: e.target.value as RepaymentMode })}
                  >
                    <option value="van">VAN QR — repayment-van</option>
                    <option value="request_confirm">request → confirm</option>
                    <option value="both">Cả 2</option>
                    <option value="none">Không có</option>
                  </Select>
                </Field>
                <Check
                  checked={m.repayment.status}
                  onChange={(v) => sub('repayment', { status: v })}
                  label="repayment-status"
                  disabled={m.repayment.mode === 'none'}
                />
                <Check
                  checked={m.repayment.partner_callback}
                  onChange={(v) => sub('repayment', { partner_callback: v })}
                  label="partner-repayment-status"
                  hint="Cake callback kết quả sang partner"
                  disabled={m.repayment.mode === 'none'}
                />
              </Section>

              <Section title="Tính năng thêm">
                <Check
                  checked={m.termination}
                  onChange={(v) => set('termination', v)}
                  label="Tất toán trước hạn"
                  hint="terminate-review/request/confirm/van"
                  disabled={isDop}
                />
                <Check
                  checked={m.payment}
                  onChange={(v) => set('payment', v)}
                  label="Thanh toán dịch vụ (Paylater)"
                  hint="payment-request/confirm/status/revert"
                />
                <Check
                  checked={m.installment}
                  onChange={(v) => set('installment', v)}
                  label="Chuyển đổi trả góp"
                  hint="get-installment-* / installment-*"
                />
                <Check
                  checked={m.callbacks.update_status}
                  onChange={(v) => sub('callbacks', { update_status: v })}
                  label="partner-update-status"
                />
              </Section>
            </>
          )}

          <Section title="Fragment custom" hint="hợp đồng đối tác đã cố định, ghi đè lên bản dựng từ base">
            {(meta?.fragments || []).length === 0 && (
              <p className="text-xs text-slate-400">không có fragment nào trong base2/custom/</p>
            )}
            {(meta?.fragments || []).map((f) => (
              <Check
                key={f}
                checked={m.custom_fragments.includes(f)}
                onChange={(v) =>
                  set('custom_fragments', v
                    ? [...m.custom_fragments, f]
                    : m.custom_fragments.filter((x) => x !== f))
                }
                label={f.replace(/\.ya?ml$/, '')}
              />
            ))}
          </Section>

          <Section title="Changelog" hint="mỗi lần gửi đối tác thêm 1 dòng">
            <Field label="Email title mặc định">
              <Text
                value={m.changelog.email_title}
                placeholder="[CAKE-KV] BRD sản phẩm Vay merchant Lending"
                onChange={(e) => sub('changelog', { email_title: e.target.value })}
              />
            </Field>
            {m.changelog.entries.map((e, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="date"
                  value={e.date}
                  onChange={(ev) => {
                    const next = [...m.changelog.entries];
                    next[i] = { ...e, date: ev.target.value };
                    sub('changelog', { entries: next });
                  }}
                  className="w-36 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={e.note}
                  placeholder="nội dung thay đổi"
                  onChange={(ev) => {
                    const next = [...m.changelog.entries];
                    next[i] = { ...e, note: ev.target.value };
                    sub('changelog', { entries: next });
                  }}
                  className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
                <button
                  onClick={() => sub('changelog', { entries: m.changelog.entries.filter((_, k) => k !== i) })}
                  className="flex-shrink-0 px-1 text-slate-400 hover:text-red-600"
                  title="Xoá dòng"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => sub('changelog', { entries: [...m.changelog.entries, { date: today(), note: '' }] })}
              className="text-xs text-blue-600 hover:underline"
            >
              + thêm dòng changelog
            </button>
          </Section>
        </div>

        {/* ── output ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 bg-white px-4 py-2 text-xs">
            <span className="font-semibold text-slate-700">{paths.length} endpoint</span>
            {(['Partner', 'Cake'] as const).map((k) => grouped[k].length > 0 && (
              <span key={k} className="text-slate-500">
                {k === 'Partner' ? 'Partner → Cake' : 'Cake → Partner'}: {grouped[k].length}
              </span>
            ))}
            {paths.length === 0 && <span className="text-slate-400">bấm Preview để dựng</span>}
          </div>
          {paths.length > 0 && (
            <div className="flex flex-shrink-0 flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2">
              {paths.map((p) => (
                <code
                  key={p}
                  className={`rounded px-1.5 py-0.5 text-[11px] ${
                    p.startsWith('/partner-')
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  {p}
                </code>
              ))}
            </div>
          )}
          <pre className="min-h-0 flex-1 overflow-auto bg-slate-900 p-4 text-[11px] leading-relaxed text-slate-100">
            {yamlOut || '# Preview YAML sẽ hiện ở đây'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default SpecBuilderPage;
