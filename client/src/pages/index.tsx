import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { taskAPI, sprintAPI } from '@/utils/api';

interface Stats {
  totalTasks: number;
  tasksInProgress: number;
  tasksCompleted: number;
  activeSprints: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    tasksInProgress: 0,
    tasksCompleted: 0,
    activeSprints: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [tasksRes, sprintsRes] = await Promise.all([
          taskAPI.getAll(),
          sprintAPI.getAll({ status: 'active' }),
        ]);

        const tasks = tasksRes.data.data || [];
        const sprints = sprintsRes.data.data || [];

        setStats({
          totalTasks: tasks.length,
          tasksInProgress: tasks.filter((t: any) => t.status === 'in-progress').length,
          tasksCompleted: tasks.filter((t: any) => t.status === 'done').length,
          activeSprints: sprints.length,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const StatCard = ({ icon, label, value, color }: any) => (
    <div className={`bg-gradient-to-br ${color} rounded-lg shadow-lg p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">{label}</p>
          <p className="text-3xl font-bold mt-2">{loading ? '-' : value}</p>
        </div>
        <div className="text-5xl opacity-20">{icon}</div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back! Here&apos;s your project overview.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon="📋"
          label="Total Tasks"
          value={stats.totalTasks}
          color="from-blue-400 to-blue-600"
        />
        <StatCard
          icon="⚡"
          label="In Progress"
          value={stats.tasksInProgress}
          color="from-yellow-400 to-yellow-600"
        />
        <StatCard
          icon="✅"
          label="Completed"
          value={stats.tasksCompleted}
          color="from-green-400 to-green-600"
        />
        <StatCard
          icon="🏃"
          label="Active Sprints"
          value={stats.activeSprints}
          color="from-purple-400 to-purple-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/tasks"
            className="block p-4 border-l-4 border-blue-500 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg mb-2">📋 Manage Tasks</h3>
            <p className="text-gray-600 text-sm mb-4">Create and track tasks with story points, priorities, and assignments.</p>
            <span className="text-blue-500 hover:text-blue-700 font-medium">
              Go to Tasks →
            </span>
          </Link>

          <Link
            href="/sprints"
            className="block p-4 border-l-4 border-purple-500 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg mb-2">🏃 Sprints</h3>
            <p className="text-gray-600 text-sm mb-4">Plan sprints, organize tasks, and monitor progress with real-time metrics.</p>
            <span className="text-purple-500 hover:text-purple-700 font-medium">
              Go to Sprints →
            </span>
          </Link>

          <Link
            href="/roadmap"
            className="block p-4 border-l-4 border-green-500 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg mb-2">🗺️ Roadmap</h3>
            <p className="text-gray-600 text-sm mb-4">Plan quarterly roadmaps and track long-term product goals.</p>
            <span className="text-green-500 hover:text-green-700 font-medium">
              Go to Roadmap →
            </span>
          </Link>

          <Link
            href="/jira"
            className="block p-4 border-l-4 border-orange-500 cursor-pointer hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg mb-2">🔗 Jira Integration</h3>
            <p className="text-gray-600 text-sm mb-4">Sync with Jira API to keep your tasks synchronized.</p>
            <span className="text-orange-500 hover:text-orange-700 font-medium">
              Go to Jira →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
