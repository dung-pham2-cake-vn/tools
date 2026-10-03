import { Roadmap, IRoadmap } from '../models/Roadmap';

export class RoadmapService {
  async createRoadmap(roadmapData: Partial<IRoadmap>): Promise<IRoadmap> {
    try {
      const roadmap = new Roadmap(roadmapData);
      return await roadmap.save();
    } catch (error) {
      console.error('Error creating roadmap:', error);
      throw error;
    }
  }

  async getRoadmaps(filter: any = {}): Promise<IRoadmap[]> {
    try {
      return await Roadmap.find(filter).populate('items.relatedTasks');
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
      throw error;
    }
  }

  async getRoadmapById(roadmapId: string): Promise<IRoadmap | null> {
    try {
      return await Roadmap.findById(roadmapId).populate('items.relatedTasks');
    } catch (error) {
      console.error('Error fetching roadmap by ID:', error);
      throw error;
    }
  }

  async updateRoadmap(roadmapId: string, updateData: Partial<IRoadmap>): Promise<IRoadmap | null> {
    try {
      return await Roadmap.findByIdAndUpdate(roadmapId, updateData, { new: true });
    } catch (error) {
      console.error('Error updating roadmap:', error);
      throw error;
    }
  }

  async deleteRoadmap(roadmapId: string): Promise<boolean> {
    try {
      const result = await Roadmap.findByIdAndDelete(roadmapId);
      return !!result;
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      throw error;
    }
  }

  async addItemToRoadmap(roadmapId: string, itemData: any): Promise<IRoadmap | null> {
    try {
      const roadmap = await Roadmap.findById(roadmapId);
      if (!roadmap) throw new Error('Roadmap not found');

      roadmap.items.push({
        id: Date.now().toString(),
        ...itemData,
      });

      return await roadmap.save();
    } catch (error) {
      console.error('Error adding item to roadmap:', error);
      throw error;
    }
  }

  async updateRoadmapItem(roadmapId: string, itemId: string, updateData: any): Promise<IRoadmap | null> {
    try {
      const roadmap = await Roadmap.findById(roadmapId);
      if (!roadmap) throw new Error('Roadmap not found');

      const item = roadmap.items.find((item) => item.id === itemId);
      if (!item) throw new Error('Roadmap item not found');

      Object.assign(item, updateData);
      return await roadmap.save();
    } catch (error) {
      console.error('Error updating roadmap item:', error);
      throw error;
    }
  }

  async removeItemFromRoadmap(roadmapId: string, itemId: string): Promise<IRoadmap | null> {
    try {
      const roadmap = await Roadmap.findById(roadmapId);
      if (!roadmap) throw new Error('Roadmap not found');

      roadmap.items = roadmap.items.filter((item) => item.id !== itemId);
      return await roadmap.save();
    } catch (error) {
      console.error('Error removing item from roadmap:', error);
      throw error;
    }
  }
}

export const roadmapService = new RoadmapService();
