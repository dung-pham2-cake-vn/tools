import React from 'react';
import { formatDateShort, getStatusColor, getPriorityColor } from '@/utils/helpers';

interface TaskCardProps {
  task: any;
  onStatusChange?: (status: string) => void;
  onDelete?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onDelete }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
          )}
        </div>
        <span className="text-2xl font-bold text-blue-600 ml-4">{task.storyPoints}</span>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
          {task.status}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <span>{task.assignee || 'Unassigned'}</span>
        <span>{formatDateShort(task.createdAt)}</span>
      </div>

      <div className="flex gap-2">
        {onStatusChange && (
          <select
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:border-blue-400 focus:outline-none focus:border-blue-500"
            defaultValue={task.status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="in-review">In Review</option>
            <option value="done">Done</option>
          </select>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
