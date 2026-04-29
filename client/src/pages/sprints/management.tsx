import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { sprintManagementAPI } from '@/utils/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConfluencePage {
  id: string;
  title: string;
  status: string;
  loaded: boolean;
  loadedAt: string | null;
}

interface LoadedPage {
  pageId: string;
  title: string;
  loadedAt: string;
  url: string;
}

interface SprintTicket {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface SprintItem {
  number: number;
  icon: '🟢' | '🟡' | '🔴';
  teams: string[];
  prNumber: string;
  title: string;
  tickets: SprintTicket[];
}

interface SprintSection {
  name: string;
  emoji: string;
  items: SprintItem[];
}

interface SprintData {
  sections: SprintSection[];
}

interface AnalysisResult {
  id: string;
  prompt: string;
  result: string;
  pageIds: string[];
  pagesTitles: string[];
  timestamp: string;
}

interface PageContentModal {
  title: string;
  textContent: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_PROMPT = `Phân tích dữ liệu Sprint Release từ Confluence. Xuất JSON hợp lệ DUY NHẤT, không thêm text hay markdown bên ngoài JSON.

Format JSON:
{
  "sections": [
    {
      "name": "Core",
      "emoji": "😤",
      "items": [
        {
          "number": 1,
          "icon": "🟢",
          "teams": ["Lend", "DOP", "Prec", "LOS"],
          "prNumber": "PR-1540",
          "title": "QTV-Payday (185+186+187/2)",
          "tickets": [
            { "id": "PL-12221", "name": "MWG QTV Payday Loan", "type": "Task", "status": "OPEN" }
          ]
        }
      ]
    },
    { "name": "Must have", "emoji": "😍", "items": [ ... ] },
    { "name": "Nice to have", "emoji": "😊", "items": [ ... ] }
  ]
}

Quy tắc:
- Lấy tất cả mục: Core, Must have, Nice to have (bỏ mục nếu không có dữ liệu)
- icon: "🟢" (IN CODING/IN PROGRESS/READY4TEST/DONE), "🟡" (IN TESTING), "🔴" (OPEN/chưa bắt đầu)
- teams: mảng tên team, tách từ [Lend+DOP] → ["Lend","DOP"]
- prNumber: mã PR nếu có, ví dụ "PR-1540" hoặc ""
- ticket.type: "Epic", "Story", "Task", "Sub-task" — suy luận từ context, không rõ → "Task"
- ticket.status: OPEN | IN CODING | IN TESTING | READY4TEST | IN PROGRESS | DRAFT | PO/TM REVIEW
- tickets = [] nếu không có sub-ticket
- Không thêm bất kỳ text nào ngoài JSON`;

function extractSprintNumber(title: string): number {
  const m = title.match(/[Ss]print\s*(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'DONE') return 'bg-green-100 text-green-800 border-green-200';
  if (s === 'READY4TEST') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (s === 'IN TESTING') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  if (s === 'IN CODING' || s === 'IN PROGRESS') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s === 'DRAFT') return 'bg-gray-100 text-gray-600 border-gray-200';
  if (s.includes('REVIEW')) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (s === 'OPEN') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function typeBadgeClass(type: string): string {
  const t = type.toLowerCase();
  if (t === 'epic') return 'bg-violet-100 text-violet-700';
  if (t === 'story') return 'bg-sky-100 text-sky-700';
  if (t === 'bug') return 'bg-red-100 text-red-700';
  if (t === 'sub-task') return 'bg-gray-100 text-gray-600';
  return 'bg-slate-100 text-slate-600';
}

function parseSprintJSON(raw: string): SprintData | null {
  try {
    // Strip possible markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    return JSON.parse(cleaned) as SprintData;
  } catch {
    return null;
  }
}

// ─── Table component ──────────────────────────────────────────────────────────

function SprintTable({ data, jiraBase }: { data: SprintData; jiraBase: string }) {
  return (
    <div className="space-y-6">
      {data.sections.map((section) => (
        <div key={section.name}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{section.emoji}</span>
            <h3 className="font-bold text-gray-900">{section.name}</h3>
            <span className="text-xs text-gray-400">({section.items.length} items)</span>
          </div>

          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-3 py-2 font-semibold w-[110px]">Ticket ID</th>
                  <th className="text-left px-3 py-2 font-semibold">Tên Ticket</th>
                  <th className="text-left px-3 py-2 font-semibold w-[90px]">Loại</th>
                  <th className="text-left px-3 py-2 font-semibold w-[130px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map((item) => (
                  <React.Fragment key={item.number}>
                    {/* Item header row */}
                    <tr className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={4} className="px-3 py-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 font-mono min-w-[18px]">{item.number}.</span>
                          <span className="text-base leading-none">{item.icon}</span>
                          {item.teams.length > 0 && (
                            <span className="font-bold text-blue-700 text-sm">
                              [{item.teams.join('+')}]
                            </span>
                          )}
                          {item.prNumber && (
                            <span className="text-xs font-mono font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.prNumber}
                            </span>
                          )}
                          <span className="font-semibold text-gray-900 text-sm">{item.title}</span>
                        </div>
                      </td>
                    </tr>

                    {/* Sub-ticket rows */}
                    {item.tickets.length === 0 ? (
                      <tr className="border-t border-gray-100">
                        <td colSpan={4} className="px-3 py-1.5 text-xs text-gray-400 italic pl-10">
                          Không có sub-ticket
                        </td>
                      </tr>
                    ) : (
                      item.tickets.map((ticket, ti) => (
                        <tr
                          key={ticket.id || ti}
                          className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 py-2 pl-8">
                            <a
                              href={`${jiraBase}/browse/${ticket.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-mono text-xs font-semibold hover:underline"
                            >
                              {ticket.id}
                            </a>
                          </td>
                          <td className="px-3 py-2 text-gray-700 text-sm">{ticket.name}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeBadgeClass(ticket.type)}`}>
                              {ticket.type}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusBadgeClass(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SprintManagementPage() {
  const [confluencePages, setConfluencePages] = useState<ConfluencePage[]>([]);
  const [loadedPagesMap, setLoadedPagesMap] = useState<Map<string, LoadedPage>>(new Map());
  const [loadingList, setLoadingList] = useState(false);
  const [loadingPageIds, setLoadingPageIds] = useState<Set<string>>(new Set());

  // Step 1 selection
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [step2Active, setStep2Active] = useState(false);

  // Step 2 analysis
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [expandedResultIds, setExpandedResultIds] = useState<Set<string>>(new Set());

  const [contentModal, setContentModal] = useState<PageContentModal | null>(null);
  const [loadingModalId, setLoadingModalId] = useState<string | null>(null);

  const step2Ref = useRef<HTMLDivElement>(null);

  // ── Derived ──
  const jiraBase = (() => {
    const first = Array.from(loadedPagesMap.values())[0];
    if (first?.url) return first.url.split('/wiki')[0];
    return 'https://cakedigitalbank.atlassian.net';
  })();

  const checkedPages = confluencePages.filter((p) => checkedIds.has(p.id));
  const unloadedChecked = checkedPages.filter((p) => !p.loaded);
  const canProceed = checkedIds.size > 0 && unloadedChecked.length === 0;

  // ── Auto-select highest sprint ──
  const autoSelectHighest = useCallback((pages: ConfluencePage[], loaded: Map<string, LoadedPage>) => {
    // prefer loaded pages first, then fall back to any
    const loadedList = pages.filter((p) => loaded.has(p.id));
    const pool = loadedList.length > 0 ? loadedList : pages;
    let best: ConfluencePage | null = null;
    let bestNum = -1;
    for (const p of pool) {
      const n = extractSprintNumber(p.title);
      if (n > bestNum) { bestNum = n; best = p; }
    }
    if (best) setCheckedIds(new Set([best.id]));
  }, []);

  // ── Load data ──
  const refreshLoadedPages = useCallback(async (): Promise<Map<string, LoadedPage>> => {
    try {
      const res = await sprintManagementAPI.getLoadedPages();
      const list: LoadedPage[] = res.data.data || [];
      const map = new Map(list.map((p) => [p.pageId, p]));
      setLoadedPagesMap(map);
      return map;
    } catch {
      return new Map();
    }
  }, []);

  const loadConfluenceChildren = useCallback(async () => {
    setLoadingList(true);
    try {
      const [pagesRes, loadedMap] = await Promise.all([
        sprintManagementAPI.getConfluenceChildren(),
        refreshLoadedPages(),
      ]);
      const pages: ConfluencePage[] = pagesRes.data.data || [];
      setConfluencePages(pages);
      setCheckedIds((prev) => {
        if (prev.size === 0) {
          // first load — auto select
          let best: ConfluencePage | null = null;
          let bestNum = -1;
          const pool = pages.filter((p) => loadedMap.has(p.id));
          for (const p of (pool.length > 0 ? pool : pages)) {
            const n = extractSprintNumber(p.title);
            if (n > bestNum) { bestNum = n; best = p; }
          }
          return best ? new Set([best.id]) : prev;
        }
        return prev;
      });
    } catch (err: any) {
      toast.error(`Không tải được danh sách: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoadingList(false);
    }
  }, [refreshLoadedPages]);

  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const res = await sprintManagementAPI.getResults();
      const data: AnalysisResult[] = res.data.data || [];
      setResults(data);
      if (data.length > 0) setExpandedResultIds(new Set([data[0].id]));
    } catch {
      // non-critical
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    loadConfluenceChildren();
    loadResults();
  }, [loadConfluenceChildren, loadResults]);

  // ── Handlers ──
  const handleLoadPage = async (pageId: string) => {
    setLoadingPageIds((prev) => new Set(prev).add(pageId));
    try {
      await sprintManagementAPI.loadPage(pageId);
      toast.success('Load thành công');
      const newMap = await refreshLoadedPages();
      setConfluencePages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? { ...p, loaded: true, loadedAt: newMap.get(pageId)?.loadedAt || new Date().toISOString() }
            : p
        )
      );
    } catch (err: any) {
      toast.error(`Load thất bại: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoadingPageIds((prev) => { const n = new Set(prev); n.delete(pageId); return n; });
    }
  };

  const handleOpenContent = async (pageId: string, title: string) => {
    setLoadingModalId(pageId);
    try {
      const res = await sprintManagementAPI.getPageContent(pageId);
      setContentModal({ title, textContent: res.data.data.textContent });
    } catch (err: any) {
      toast.error(`Không mở được: ${err?.response?.data?.error || err.message}`);
    } finally {
      setLoadingModalId(null);
    }
  };

  const handleProceed = () => {
    setStep2Active(true);
    setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleAnalyze = async () => {
    const pageIds = Array.from(checkedIds);
    setAnalyzing(true);
    try {
      const res = await sprintManagementAPI.analyze({ pageIds, prompt });
      const entry: AnalysisResult = res.data.data;
      setResults((prev) => [entry, ...prev]);
      setExpandedResultIds((prev) => new Set([entry.id, ...prev]));
      toast.success('Phân tích xong');
    } catch (err: any) {
      toast.error(`Lỗi: ${err?.response?.data?.error || err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleResult = (id: string) =>
    setExpandedResultIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleCheck = (id: string) =>
    setCheckedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sprint Management</h1>
        <p className="mt-1 text-sm text-gray-500">Load trang Confluence và phân tích tickets với AI</p>
      </div>

      {/* ── Step 1 ── */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
            Chọn Confluence Pages
          </h2>
          <button
            onClick={loadConfluenceChildren}
            disabled={loadingList}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <span className={loadingList ? 'animate-spin inline-block' : ''}>↻</span>
            Reload list
          </button>
        </div>

        <div className="px-6 py-4">
          {loadingList ? (
            <div className="py-8 text-center text-gray-400 text-sm">Đang tải...</div>
          ) : confluencePages.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">Không có trang. Nhấn Reload.</div>
          ) : (
            <>
              <div className="space-y-1.5 mb-4">
                {confluencePages.map((page) => {
                  const isLoading = loadingPageIds.has(page.id);
                  const checked = checkedIds.has(page.id);
                  return (
                    <div
                      key={page.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                        checked
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-100 hover:border-blue-100 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleCheck(page.id)}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}
                        onClick={(e) => { e.stopPropagation(); toggleCheck(page.id); }}
                      >
                        {checked && <span className="text-white text-xs leading-none">✓</span>}
                      </div>

                      {/* Status dot */}
                      <span className="text-base flex-shrink-0">{page.loaded ? '✅' : '⬜'}</span>

                      {/* Title + date */}
                      <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <p className={`text-sm font-medium truncate ${checked ? 'text-blue-900' : 'text-gray-900'}`}>
                          {page.title}
                        </p>
                        {page.loaded && page.loadedAt && (
                          <p className="text-xs text-gray-400">Loaded {formatDate(page.loadedAt)}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1.5 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleLoadPage(page.id)}
                          disabled={isLoading}
                          className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isLoading ? '⏳' : page.loaded ? '↺' : '↓ Load'}
                        </button>
                        {page.loaded && (
                          <button
                            onClick={() => handleOpenContent(page.id, page.title)}
                            disabled={loadingModalId === page.id}
                            className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                          >
                            {loadingModalId === page.id ? '⏳' : '🔍'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Proceed button */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  {checkedIds.size === 0 ? (
                    'Chọn ít nhất 1 trang'
                  ) : unloadedChecked.length > 0 ? (
                    <span className="text-amber-600">
                      ⚠ {unloadedChecked.length} trang chưa load: {unloadedChecked.map((p) => p.title).join(', ')}
                    </span>
                  ) : (
                    <span className="text-green-600">✓ {checkedIds.size} trang sẵn sàng</span>
                  )}
                </div>
                <button
                  onClick={handleProceed}
                  disabled={!canProceed}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
                >
                  Tiếp tục →
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Step 2 ── */}
      <div
        ref={step2Ref}
        className={`rounded-xl bg-white shadow-sm border transition-all ${
          step2Active ? 'border-gray-100 opacity-100' : 'border-gray-100 opacity-40 pointer-events-none'
        }`}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${step2Active ? 'bg-blue-600' : 'bg-gray-400'}`}>2</span>
            Kiểm tra Tickets với AI
            {checkedIds.size > 0 && step2Active && (
              <span className="text-xs text-gray-400 font-normal ml-1">
                ({Array.from(checkedIds).map((id) => confluencePages.find((p) => p.id === id)?.title).filter(Boolean).join(', ')})
              </span>
            )}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Prompt</p>
              <button
                onClick={() => setPrompt(DEFAULT_PROMPT)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                ↺ Reset
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={10}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y bg-gray-50"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !canProceed}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors shadow-sm"
          >
            {analyzing ? <><span className="animate-spin inline-block">⏳</span> Đang xử lý...</> : '✨ Xử lý với AI'}
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {(results.length > 0 || loadingResults) && (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Kết quả phân tích</h2>
          </div>

          {loadingResults ? (
            <div className="py-8 text-center text-gray-400 text-sm">Đang tải...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((r, i) => {
                const isExpanded = expandedResultIds.has(r.id);
                const parsed = parseSprintJSON(r.result);
                return (
                  <div key={r.id} className="px-6 py-4">
                    {/* Header toggle */}
                    <button
                      onClick={() => toggleResult(r.id)}
                      className="w-full flex items-center justify-between gap-4 text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {i === 0 && (
                          <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                            Mới nhất
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {r.pagesTitles?.join(', ') || 'Kết quả'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.timestamp)}</p>
                        </div>
                      </div>
                      <span className="text-gray-400 flex-shrink-0">{isExpanded ? '▾' : '▸'}</span>
                    </button>

                    {/* Content */}
                    {isExpanded && (
                      <div className="mt-4">
                        {parsed ? (
                          <SprintTable data={parsed} jiraBase={jiraBase} />
                        ) : (
                          <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                            <p className="text-xs text-amber-600 mb-2">⚠ Không parse được JSON, hiển thị raw:</p>
                            <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed">{r.result}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Content Modal ── */}
      {contentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900 text-sm truncate pr-4">{contentModal.title}</h3>
              <button
                onClick={() => setContentModal(null)}
                className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex-1">
              <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono leading-relaxed">
                {contentModal.textContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
