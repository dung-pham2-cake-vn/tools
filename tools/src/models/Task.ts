import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  storyPoints: number;
  status: 'todo' | 'in-progress' | 'in-review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  sprint?: mongoose.Types.ObjectId;
  jiraKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    storyPoints: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'in-review', 'done'],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    assignee: {
      type: String,
    },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: 'Sprint',
    },
    jiraKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

export const Task = mongoose.model<ITask>('Task', taskSchema);
