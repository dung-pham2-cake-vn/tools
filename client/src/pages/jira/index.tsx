import React from 'react';
import Link from 'next/link';

interface JiraMenu {
  label: string;
  description: string;
  path: string;
  icon: string;
}

const JIRA_MENUS: JiraMenu[] = [
  {
    label: 'PO Tickets',
    description: 'Task & Subtask đang assign cho PO (Tech Product Manager)',
    path: '/jira/po-tickets',
    icon: '🎯',
  },
];

export default function JiraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Jira</h1>
        <p className="mt-2 text-sm text-gray-600">Chọn một mục bên dưới hoặc trong menu Jira ở sidebar.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {JIRA_MENUS.map((menu) => (
          <Link
            key={menu.path}
            href={menu.path}
            className="block rounded-lg bg-white p-6 shadow-md transition-shadow hover:shadow-lg"
          >
            <div className="text-3xl">{menu.icon}</div>
            <h2 className="mt-3 text-xl font-bold text-gray-900">{menu.label}</h2>
            <p className="mt-1 text-sm text-gray-600">{menu.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
