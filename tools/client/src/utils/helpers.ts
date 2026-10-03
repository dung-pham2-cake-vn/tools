export const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateShort = (date: string | Date) => {
  return new Date(date).toLocaleDateString('vi-VN');
};

export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'in-review': 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
    planning: 'bg-gray-100 text-gray-800',
    active: 'bg-blue-100 text-blue-800',
    closed: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getPriorityColor = (priority: string) => {
  const colors: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export const getPriorityOrder = (priority: string) => {
  const order: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return order[priority] || 0;
};

export const sortByPriority = (items: any[]) => {
  return items.sort((a, b) => getPriorityOrder(b.priority) - getPriorityOrder(a.priority));
};
