import React from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function applyMarks(text: string, marks: any[]): React.ReactNode {
  if (!marks || !marks.length) return text;
  let node: React.ReactNode = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong': node = <strong key="s">{node}</strong>; break;
      case 'em': node = <em key="e">{node}</em>; break;
      case 'underline': node = <u key="u">{node}</u>; break;
      case 'strike': node = <s key="st">{node}</s>; break;
      case 'code': node = <code key="c" className="bg-gray-100 px-1 rounded text-xs font-mono">{node}</code>; break;
      case 'link':
        node = (
          <a key="l" href={mark.attrs?.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {node}
          </a>
        );
        break;
    }
  }
  return node;
}

function renderNode(node: any, idx: number): React.ReactNode {
  if (!node) return null;

  switch (node.type) {
    case 'doc':
      return <>{(node.content || []).map((n: any, i: number) => renderNode(n, i))}</>;

    case 'paragraph':
      return (
        <p key={idx} className="mb-2 last:mb-0">
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </p>
      );

    case 'text':
      return <React.Fragment key={idx}>{applyMarks(node.text || '', node.marks || [])}</React.Fragment>;

    case 'hardBreak':
      return <br key={idx} />;

    case 'heading':
      const level = node.attrs?.level || 1;
      const cls = ['font-bold', level <= 2 ? 'text-base' : 'text-sm', 'mb-1 mt-2'].join(' ');
      return (
        <div key={idx} className={cls}>
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </div>
      );

    case 'bulletList':
      return (
        <ul key={idx} className="list-disc list-inside mb-2 space-y-0.5">
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </ul>
      );

    case 'orderedList':
      return (
        <ol key={idx} className="list-decimal list-inside mb-2 space-y-0.5">
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </ol>
      );

    case 'listItem':
      return (
        <li key={idx} className="text-sm">
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </li>
      );

    case 'blockquote':
      return (
        <blockquote key={idx} className="border-l-4 border-gray-300 pl-3 text-gray-600 italic mb-2">
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </blockquote>
      );

    case 'codeBlock':
      return (
        <pre key={idx} className="bg-gray-100 rounded p-2 text-xs font-mono overflow-x-auto mb-2">
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </pre>
      );

    case 'mediaSingle':
    case 'mediaGroup':
      return (
        <div key={idx} className="my-2">
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </div>
      );

    case 'media': {
      const { id, type, url, alt } = node.attrs || {};
      if (type === 'external' && url) {
        return (
          <img
            key={idx}
            src={url}
            alt={alt || ''}
            className="max-w-full rounded border border-gray-200 my-1"
            loading="lazy"
          />
        );
      }
      if (id) {
        return (
          <img
            key={idx}
            src={`${API_BASE}/support/attachment/${id}`}
            alt={alt || 'attachment'}
            className="max-w-full rounded border border-gray-200 my-1"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        );
      }
      return null;
    }

    case 'inlineCard':
    case 'embedCard': {
      const cardUrl = node.attrs?.url;
      return cardUrl ? (
        <a key={idx} href={cardUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline break-all">
          {cardUrl}
        </a>
      ) : null;
    }

    case 'mention':
      return (
        <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-1 rounded">
          @{node.attrs?.text || node.attrs?.id || ''}
        </span>
      );

    case 'emoji':
      return <span key={idx}>{node.attrs?.text || node.attrs?.shortName || ''}</span>;

    case 'rule':
      return <hr key={idx} className="my-2 border-gray-200" />;

    case 'table':
      return (
        <div key={idx} className="overflow-x-auto mb-2">
          <table className="text-xs border-collapse border border-gray-200">
            <tbody>{(node.content || []).map((n: any, i: number) => renderNode(n, i))}</tbody>
          </table>
        </div>
      );

    case 'tableRow':
      return <tr key={idx}>{(node.content || []).map((n: any, i: number) => renderNode(n, i))}</tr>;

    case 'tableCell':
    case 'tableHeader':
      return (
        <td key={idx} className="border border-gray-200 px-2 py-1 align-top">
          {(node.content || []).map((n: any, i: number) => renderNode(n, i))}
        </td>
      );

    default:
      if (node.content) {
        return <React.Fragment key={idx}>{(node.content || []).map((n: any, i: number) => renderNode(n, i))}</React.Fragment>;
      }
      return null;
  }
}

interface Props {
  adf: any;
  fallback?: string;
  className?: string;
}

const AdfRenderer: React.FC<Props> = ({ adf, fallback = '', className = '' }) => {
  if (!adf) {
    return fallback ? <p className={`text-sm text-gray-700 whitespace-pre-wrap ${className}`}>{fallback}</p> : null;
  }
  if (typeof adf === 'string') {
    return <p className={`text-sm text-gray-700 whitespace-pre-wrap ${className}`}>{adf}</p>;
  }
  return (
    <div className={`text-sm text-gray-700 ${className}`}>
      {renderNode(adf, 0)}
    </div>
  );
};

export default AdfRenderer;
