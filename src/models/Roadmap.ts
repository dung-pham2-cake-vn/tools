import mongoose, { Schema, Document } from 'mongoose';

export interface IRoadmap extends Document {
  title: string;
  description?: string;
  version: string;
  status: 'planning' | 'in-progress' | 'completed';
  targetDate?: Date;
  items: IroadmapItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IroadmapItem {
  id: string;
  title: string;
  description?: string;
  quarter: string;
  status: 'planned' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  relatedTasks?: mongoose.Types.ObjectId[];
}

const roadmapItemSchema = new Schema<IroadmapItem>({
  id: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  quarter: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed'],
    default: 'planned',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  relatedTasks: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
  ],
});

const roadmapSchema = new Schema<IRoadmap>(
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
    version: {
      type: String,
      required: true,
      default: '1.0.0',
    },
    status: {
      type: String,
      enum: ['planning', 'in-progress', 'completed'],
      default: 'planning',
    },
    targetDate: Date,
    items: [roadmapItemSchema],
  },
  { timestamps: true }
);

export const Roadmap = mongoose.model<IRoadmap>('Roadmap', roadmapSchema);
