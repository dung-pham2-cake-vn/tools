import { Request, Response } from 'express';
import { getConfig, setConfig } from '../models/AppConfig';
import { testAIConfig } from '../services/AIService';

const AI_CONFIG_KEY = 'ai_config';
const TEAM_CAPACITY_KEY = 'team_capacity';

export const getAIConfig = async (req: Request, res: Response) => {
  try {
    const config = await getConfig(AI_CONFIG_KEY);
    res.json(config || {});
  } catch (error: any) {
    res.status(500).json({ message: error?.message });
  }
};

export const saveAIConfig = async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, model, baseUrl } = req.body;
    await setConfig(AI_CONFIG_KEY, { provider, apiKey, model, baseUrl });
    res.json({ message: 'Config saved' });
  } catch (error: any) {
    res.status(500).json({ message: error?.message });
  }
};

export const getTeamCapacity = async (req: Request, res: Response) => {
  try {
    const config = await getConfig(TEAM_CAPACITY_KEY);
    res.json(config || {});
  } catch (error: any) {
    res.status(500).json({ message: error?.message });
  }
};

export const saveTeamCapacity = async (req: Request, res: Response) => {
  try {
    const { qa, backend, web, mobile } = req.body;
    const num = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };
    await setConfig(TEAM_CAPACITY_KEY, { qa: num(qa), backend: num(backend), web: num(web), mobile: num(mobile) });
    res.json({ message: 'Config saved' });
  } catch (error: any) {
    res.status(500).json({ message: error?.message });
  }
};

export const testAIConfigEndpoint = async (req: Request, res: Response) => {
  try {
    const result = await testAIConfig();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message });
  }
};
