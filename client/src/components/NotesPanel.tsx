import React, { useCallback, useEffect, useRef, useState } from 'react';

const NOTES_KEY = 'dashboard:notes';
const OPEN_KEY = 'dashboard:notesOpen';

// "- ", "* ", "• " hoặc "1. " ở đầu dòng (giữ cả phần thụt đầu dòng)
const MARKER_RE = /^(\s*)([-*•]|\d+\.)(\s+)(.*)$/;

function nextMarker(marker: string): string {
  const num = marker.match(/^(\d+)\.$/);
  return num ? `${Number(num[1]) + 1}.` : marker;
}

/** Enter giữa danh sách thì tự xuống dòng kèm dấu đầu dòng kế tiếp, như Notes của macOS. */
function continueList(value: string, caret: number): { value: string; caret: number } | null {
  const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
  const currentLine = value.slice(lineStart, caret);
  const matched = currentLine.match(MARKER_RE);
  if (!matched) return null;

  const [, indent, marker, spacing, content] = matched;
  // dòng chỉ có dấu đầu dòng -> Enter để thoát khỏi danh sách
  if (!content.trim()) {
    const next = value.slice(0, lineStart) + indent + value.slice(caret);
    return { value: next, caret: lineStart + indent.length };
  }

  const insert = `\n${indent}${nextMarker(marker)}${spacing}`;
  return {
    value: value.slice(0, caret) + insert + value.slice(caret),
    caret: caret + insert.length,
  };
}

/** Thêm/bỏ dấu đầu dòng cho các dòng đang chọn. */
function toggleMarker(value: string, start: number, end: number, kind: 'bullet' | 'number') {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEndIdx = value.indexOf('\n', end);
  const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
  const block = value.slice(lineStart, lineEnd);

  let counter = 0;
  const lines = block.split('\n').map((line) => {
    const matched = line.match(MARKER_RE);
    if (matched) return `${matched[1]}${matched[4]}`; // đang có dấu -> bỏ đi
    counter += 1;
    const indent = line.match(/^\s*/)?.[0] ?? '';
    const marker = kind === 'bullet' ? '-' : `${counter}.`;
    return `${indent}${marker} ${line.trimStart()}`;
  });

  const replaced = lines.join('\n');
  return { value: value.slice(0, lineStart) + replaced + value.slice(lineEnd), caret: lineStart + replaced.length };
}

export default function NotesPanel() {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState('');
  const [savedAt, setSavedAt] = useState<string>('');
  const [ready, setReady] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      setText(localStorage.getItem(NOTES_KEY) || '');
      setOpen(localStorage.getItem(OPEN_KEY) !== 'false');
    } catch {
      // localStorage bị chặn -> vẫn dùng được, chỉ không lưu
    }
    setReady(true);
  }, []);

  // tự lưu sau khi ngừng gõ
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(NOTES_KEY, text);
        setSavedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
      } catch {
        // bỏ qua
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [text, ready]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(OPEN_KEY, String(next));
      } catch {
        // bỏ qua
      }
      return next;
    });
  }, []);

  const applyEdit = (next: { value: string; caret: number }) => {
    setText(next.value);
    requestAnimationFrame(() => {
      const area = areaRef.current;
      if (!area) return;
      area.focus();
      area.setSelectionRange(next.caret, next.caret);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const area = e.currentTarget;
    if (e.key === 'Enter' && !e.shiftKey) {
      const result = continueList(area.value, area.selectionStart);
      if (result) {
        e.preventDefault();
        applyEdit(result);
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const caret = area.selectionStart;
      applyEdit({ value: `${area.value.slice(0, caret)}  ${area.value.slice(area.selectionEnd)}`, caret: caret + 2 });
    }
  };

  const addMarker = (kind: 'bullet' | 'number') => {
    const area = areaRef.current;
    if (!area) return;
    applyEdit(toggleMarker(area.value, area.selectionStart, area.selectionEnd, kind));
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Ghi chú</h3>
          <span className="text-[11px] text-gray-400">
            {savedAt ? `đã lưu lúc ${savedAt}` : 'tự lưu trên máy này'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {open && (
            <>
              <button
                type="button"
                onClick={() => addMarker('bullet')}
                title="Gạch đầu dòng"
                className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                •
              </button>
              <button
                type="button"
                onClick={() => addMarker('number')}
                title="Danh sách đánh số"
                className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                1.
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleOpen}
            className="rounded border border-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
          >
            {open ? 'Thu gọn' : 'Mở ra'}
          </button>
        </div>
      </div>

      {open && (
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={'Ghi chú tự do...\n- Enter giữ nguyên gạch đầu dòng\n1. Danh sách số tự tăng'}
          className="min-h-[140px] w-full resize-y rounded-lg border border-gray-200 px-3 py-2 font-mono text-[13px] leading-relaxed text-gray-800 outline-none focus:border-blue-400"
        />
      )}
    </div>
  );
}
