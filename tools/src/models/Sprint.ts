import mongoose, { Schema, Document } from 'mongoose';

export interface ISprint extends Document {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'closed';
  totalStoryPoints: number;
  completedStoryPoints: number;
  tasks: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const sprintSchema = new Schema<ISprint>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'closed'],
      default: 'planning',
    },
    totalStoryPoints: {
      type: Number,
      default: 0,
    },
    completedStoryPoints: {
      type: Number,
      default: 0,
    },
    tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
  },
  { timestamps: true }
);

export const Sprint = mongoose.model<ISprint>('Sprint', sprintSchema);
