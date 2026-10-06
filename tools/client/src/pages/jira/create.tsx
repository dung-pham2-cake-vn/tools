import React from 'react';
import { useRouter } from 'next/router';
import CreateSprintPage from '../sprints/create';
import FixVersionsPage from './fix-versions';
import TechDebtPage from './tech-debt';

type ToolKey = 'sprint' | 'fix-version' | 'tech-debt';

const TOOLS: Array<{ key: ToolKey; label: string; icon: string; hint: string }> = [
  { key: 'sprint', label: 'Sprint', icon: '🏃', hint: 'Đề xuất & tạo các sprint kế tiếp cho board' },
  { key: 'fix-version', label: 'Fix Version', icon: '🏷️', hint: 'Tạo fix version theo lịch sprint' },
  { key: 'tech-debt', label: 'Tech Debt', icon: '🧹', hint: 'Tạo ticket TechDebt cho từng sprint' },
];

/** Gom 3 công cụ tạo hàng loạt trên Jira vào một trang, chuyển qua lại bằng tab (?tool=…). */
export default function JiraCreatePage() {
  const router = useRouter();
  const active: ToolKey = TOOLS.some((t) => t.key === router.query.tool)
    ? (router.query.tool as ToolKey)
    : 'sprint';

  const select = (key: ToolKey) =>
    router.replace({ pathname: router.pathname, query: { tool: key } }, undefined, { shallow: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tạo trên Jira</h1>
        <p className="mt-1 text-sm text-gray-500">Tạo hàng loạt sprint, fix version và ticket TechDebt cho các sprint sắp tới.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {TOOLS.map((tool) => {
          const isActive = tool.key === active;
          return (
            <button
              key={tool.key}
              type="button"
              onClick={() => select(tool.key)}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl leading-none">{tool.icon}</span>
              <span>
                <span className={`block text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-gray-800'}`}>
                  Tạo {tool.label}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">{tool.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        {active === 'sprint' && <CreateSprintPage embedded />}
        {active === 'fix-version' && <FixVersionsPage embedded />}
        {active === 'tech-debt' && <TechDebtPage embedded />}
      </div>
    </div>
  );
}
