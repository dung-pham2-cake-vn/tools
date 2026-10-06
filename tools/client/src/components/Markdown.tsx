import React from 'react';

const JIRA_BASE = 'https://cakedigitalbank.atlassian.net';

/** Mã ticket Jira trong text thường (PL-123, DOP-45...) — bỏ các chuẩn hay gặp như ISO-27001. */
const TICKET_RE = /\b[A-Z][A-Z0-9]{1,9}-\d{1,6}\b/;
const NOT_TICKET = new Set(['ISO', 'UTF', 'SHA', 'RFC', 'TCVN', 'AES', 'COVID', 'MD', 'HTTP', 'GPT']);

// thứ tự quan trọng: code > link > bold > italic > url > ticket
const INLINE_RE = new RegExp(
  [
    '`([^`]+)`',
    '\\[([^\\]]+)\\]\\((https?:\\/\\/[^)\\s]+)\\)',
    '\\*\\*(.+?)\\*\\*',
    '__(.+?)__',
    '(?<![\\w*])\\*(?!\\s)(.+?)(?<!\\s)\\*(?![\\w*])',
    '(?<![\\w])_(?!\\s)(.+?)(?<!\\s)_(?![\\w])',
    '~~(.+?)~~',
    '(https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?])',
    `(${TICKET_RE.source})`,
  ].join('|'),
  'g'
);

const linkClass = 'text-blue-600 hover:underline break-all';

function renderInline(text: string, keyPrefix = 'i'): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  const re = new RegExp(INLINE_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${n++}`;
    const [whole, code, linkText, linkHref, bold1, bold2, italic1, italic2, strike, url, ticket] = m;
    if (code !== undefined) {
      out.push(
        <code key={key} className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[0.85em]">
          {code}
        </code>
      );
    } else if (linkText !== undefined) {
      out.push(
        <a key={key} href={linkHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {renderInline(linkText, key)}
        </a>
      );
    } else if (bold1 !== undefined || bold2 !== undefined) {
      out.push(<strong key={key} className="font-semibold text-gray-900">{renderInline(bold1 ?? bold2, key)}</strong>);
    } else if (italic1 !== undefined || italic2 !== undefined) {
      out.push(<em key={key}>{renderInline(italic1 ?? italic2, key)}</em>);
    } else if (strike !== undefined) {
      out.push(<s key={key}>{renderInline(strike, key)}</s>);
    } else if (url !== undefined) {
      out.push(
        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {url}
        </a>
      );
    } else if (ticket !== undefined && !NOT_TICKET.has(ticket.split('-')[0])) {
      out.push(
        <a key={key} href={`${JIRA_BASE}/browse/${ticket}`} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-blue-600 hover:underline">
          {ticket}
        </a>
      );
    } else {
      out.push(whole);
    }
    last = m.index + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: Array<{ indent: number; text: string; ordered: boolean }> }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'table'; header: string[]; rows: string[][] }
  | { kind: 'hr' };

const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const fence = trimmed.match(/^```(\w*)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i++;
      blocks.push({ kind: 'code', lang: fence[1], text: body.join('\n') });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2].replace(/\s*#+$/, '') });
      i++;
      continue;
    }

    if (/^([-*_])(\s*\1){2,}$/.test(trimmed)) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const header = splitRow(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(splitRow(lines[i++]));
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    if (trimmed.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) body.push(lines[i++].trim().replace(/^>\s?/, ''));
      blocks.push({ kind: 'quote', lines: body });
      continue;
    }

    if (LIST_RE.test(line)) {
      const items: Array<{ indent: number; text: string; ordered: boolean }> = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (m) {
          items.push({ indent: m[1].replace(/\t/g, '  ').length, text: m[3], ordered: /\d/.test(m[2]) });
          i++;
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          // dòng tiếp theo của item (thụt lề)
          items[items.length - 1].text += ` ${lines[i].trim()}`;
          i++;
        } else break;
      }
      blocks.push({ kind: 'list', ordered: items[0].ordered, items });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !LIST_RE.test(lines[i]) &&
      !/^(#{1,6}\s|```|>|\|)/.test(lines[i].trim())
    ) {
      para.push(lines[i++]);
    }
    blocks.push({ kind: 'paragraph', lines: para });
  }
  return blocks;
}

/** Danh sách lồng nhau theo độ thụt lề. */
function renderList(items: Array<{ indent: number; text: string; ordered: boolean }>, key: string): React.ReactNode {
  const base = items[0]?.indent ?? 0;
  const groups: Array<{ text: string; children: typeof items }> = [];
  for (const item of items) {
    if (item.indent > base && groups.length) groups[groups.length - 1].children.push(item);
    else groups.push({ text: item.text, children: [] });
  }
  const ordered = items[0]?.ordered;
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag key={key} className={`${ordered ? 'list-decimal' : 'list-disc'} space-y-0.5 pl-5`}>
      {groups.map((g, idx) => (
        <li key={`${key}-${idx}`}>
          {renderInline(g.text, `${key}-${idx}`)}
          {g.children.length > 0 && renderList(g.children, `${key}-${idx}-c`)}
        </li>
      ))}
    </Tag>
  );
}

const HEADING_CLASS = ['', 'text-base', 'text-base', 'text-sm', 'text-sm', 'text-sm', 'text-sm'];

/** Markdown nhẹ cho câu trả lời AI: heading, đậm/nghiêng/gạch, code, list lồng, bảng, quote, link + mã ticket. */
const Markdown: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => (
  <div className={`space-y-2 break-words ${className}`}>
    {parseBlocks(text).map((block, idx) => {
      const key = `b${idx}`;
      switch (block.kind) {
        case 'heading':
          return (
            <p key={key} className={`${HEADING_CLASS[block.level]} mt-3 font-bold text-gray-900 first:mt-0`}>
              {renderInline(block.text, key)}
            </p>
          );
        case 'paragraph':
          return (
            <p key={key}>
              {block.lines.map((line, li) => (
                <React.Fragment key={li}>
                  {li > 0 && <br />}
                  {renderInline(line, `${key}-${li}`)}
                </React.Fragment>
              ))}
            </p>
          );
        case 'list':
          return renderList(block.items, key);
        case 'quote':
          return (
            <blockquote key={key} className="border-l-4 border-gray-300 pl-3 text-gray-600">
              {block.lines.map((line, li) => (
                <p key={li}>{renderInline(line, `${key}-${li}`)}</p>
              ))}
            </blockquote>
          );
        case 'code':
          return (
            <pre key={key} className="overflow-x-auto rounded bg-slate-800 p-3 font-mono text-xs text-slate-100">
              {block.text}
            </pre>
          );
        case 'table':
          return (
            <div key={key} className="overflow-x-auto">
              <table className="border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    {block.header.map((cell, ci) => (
                      <th key={ci} className="border border-gray-200 px-2 py-1 text-left font-semibold">
                        {renderInline(cell, `${key}-h${ci}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-gray-200 px-2 py-1 align-top">
                          {renderInline(cell, `${key}-${ri}-${ci}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        case 'hr':
          return <hr key={key} className="border-gray-200" />;
        default:
          return null;
      }
    })}
  </div>
);

export default Markdown;
