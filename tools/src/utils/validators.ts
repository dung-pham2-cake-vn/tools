/**
 * Validation utilities for request data
 */

export const validateStoryPoints = (points: number): boolean => {
  return typeof points === 'number' && points >= 0;
};

export const validateTaskStatus = (status: string): boolean => {
  const validStatuses = ['todo', 'in-progress', 'in-review', 'done'];
  return validStatuses.includes(status);
};

export const validateTaskPriority = (priority: string): boolean => {
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  return validPriorities.includes(priority);
};

export const validateDateRange = (startDate: Date, endDate: Date): boolean => {
  return new Date(startDate) < new Date(endDate);
};

export const validateSprintStatus = (status: string): boolean => {
  const validStatuses = ['planning', 'active', 'closed'];
  return validStatuses.includes(status);
};

/**
 * Formatting utilities
 */

export const formatDate = (date: Date): string => {
  return new Date(date).toISOString().split('T')[0];
};

export const calculateDaysBetween = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
};

/**
 * Error handling
 */

export class AppError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleAsyncError = (fn: Function) => {
  return (...args: any[]) => Promise.resolve(fn(...args)).catch(args[args.length - 1]);
};
