import React, { useEffect, useState } from 'react';

interface SpecEntry {
  path: string;
  size: number;
  mtime: number;
}

const OpenApiSpecPage: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch('/api/openapi/specs')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { count: number; files: SpecEntry[] }) => {
        setCount(d.count);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [reloadKey]);

  // Layout already gives us <main class="ml-64 p-8">; -m-8 bleeds the viewer
  // to the full pane so the iframe owns the whole viewport height.
  return (
    <div className="-m-8 flex h-screen flex-col overflow-hidden bg-white">
      <header className="flex flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="whitespace-nowrap text-lg font-semibold text-slate-800">📄 OpenAPI Spec</h1>
        <span
          className={`truncate text-sm ${error ? 'text-red-600' : 'text-slate-500'}`}
          title={error ?? undefined}
        >
          {error
            ? `specs folder unreadable: ${error}`
            : count === null
              ? 'loading specs…'
              : `${count} specs · open_api_viewer/specs`}
        </span>
        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="ml-auto flex-shrink-0 whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-blue-500 hover:text-blue-600"
        >
          ↻ Reload viewer
        </button>
      </header>

      <iframe
        key={reloadKey}
        src="/api/openapi/viewer?embed=1"
        title="OpenAPI Viewer"
        className="min-h-0 w-full flex-1 border-0"
      />
    </div>
  );
};

export default OpenApiSpecPage;
