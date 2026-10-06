import React from 'react';
import { formatDateShort, getStatusColor } from '@/utils/helpers';

interface SprintCardProps {
  sprint: any;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

const SprintCard: React.FC<SprintCardProps> = ({ sprint, onEdit, onDelete, onClick }) => {
  const completionPercentage = sprint.totalStoryPoints > 0 
    ? Math.round((sprint.completedStoryPoints / sprint.totalStoryPoints) * 100)
    : 0;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{sprint.name}</h3>
          {sprint.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{sprint.description}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sprint.status)}`}>
          {sprint.status}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span className="font-semibold">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{sprint.completedStoryPoints} / {sprint.totalStoryPoints} story points</span>
          <span>{sprint.tasks?.length || 0} tasks</span>
        </div>
      </div>

      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default SprintCard;
