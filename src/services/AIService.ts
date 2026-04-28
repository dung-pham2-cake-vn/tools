import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { getConfig } from '../models/AppConfig';

interface AIConfig {
  provider: 'anthropic' | 'openai' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export const getAIConfig = async (): Promise<AIConfig | null> => {
  return getConfig('ai_config');
};

const callAnthropic = async (apiKey: string, model: string, prompt: string): Promise<string> => {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: model || 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  console.log('[AI] Anthropic response stop_reason:', message.stop_reason, 'content blocks:', message.content.length);
  const block = message.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('Anthropic returned no text content');
  return block.text;
};

const callOpenAI = async (apiKey: string, model: string, baseUrl: string, prompt: string): Promise<string> => {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const response = await axios.post(
    url,
    {
      model: model || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. /no_think' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      // disable thinking for Qwen3 and similar models
      chat_template_kwargs: { enable_thinking: false },
    },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );
  const msg = response.data.choices?.[0]?.message;
  console.log('[AI] OpenAI message keys:', msg ? Object.keys(msg) : 'null');
  console.log('[AI] OpenAI message.content:', JSON.stringify(msg?.content)?.slice(0, 200));

  // Qwen3 thinking models return content in reasoning_content when thinking, text in content
  // Some providers put final answer in content, some in reasoning_content
  const text = msg?.content || msg?.reasoning_content || msg?.text;
  if (!text) {
    console.error('[AI] Full message object:', JSON.stringify(msg));
    throw new Error(`No content in response. Message keys: ${msg ? Object.keys(msg).join(', ') : 'null'}`);
  }
  return text;
};

export const testAIConfig = async (): Promise<{ ok: boolean; provider: string; model: string; error?: string }> => {
  const config: AIConfig | null = await getAIConfig();
  if (!config?.apiKey) return { ok: false, provider: '', model: '', error: 'Not configured' };

  try {
    const prompt = 'Reply with exactly: OK';
    let result: string;
    if (config.provider === 'anthropic') {
      result = await callAnthropic(config.apiKey, config.model, prompt);
    } else {
      result = await callOpenAI(config.apiKey, config.model, config.baseUrl || 'https://api.openai.com', prompt);
    }
    return { ok: true, provider: config.provider, model: config.model, error: undefined };
  } catch (err: any) {
    return { ok: false, provider: config.provider, model: config.model, error: err?.message };
  }
};

export const analyzeTicketWithAI = async (ticketData: {
  key: string;
  title: string;
  description: string;
  status: string;
  type: string;
  assignee: string;
  comments: { author: string; body: string; created: string }[];
  linkedWorkItems: any[];
}): Promise<string> => {
  const config: AIConfig | null = await getAIConfig();
  console.log('[AI] config loaded:', config ? `provider=${config.provider} model=${config.model} hasKey=${!!config.apiKey}` : 'NULL');
  if (!config?.apiKey) throw new Error('AI not configured. Go to Settings to configure.');

  const commentsText = ticketData.comments
    .map((c) => `[${c.author} - ${new Date(c.created).toLocaleDateString()}]: ${c.body}`)
    .join('\n\n');

  const linkedText = ticketData.linkedWorkItems
    .map((l) => {
      const linked = l.inwardIssue || l.outwardIssue;
      return linked ? `${l.type}: ${linked.key} - ${linked.summary || ''}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const prompt = `You are analyzing a support ticket. Based on all available information, provide a concise analysis in exactly this format. Keep the 4 label names in English but write the content in Vietnamese:

Symptoms: <triệu chứng và vấn đề được báo cáo>
Root cause: <nguyên nhân gốc rễ>
Resolution: <cách đã hoặc nên xử lý>
Prevention: <cách phòng ngừa trong tương lai>

Ticket: ${ticketData.key} - ${ticketData.title}
Status: ${ticketData.status}
Type: ${ticketData.type}
Assignee: ${ticketData.assignee || 'Unassigned'}

Description:
${ticketData.description || '(none)'}

${linkedText ? `Linked items:\n${linkedText}\n` : ''}
${commentsText ? `Comments:\n${commentsText}` : ''}

Respond only with the 4-line analysis. Labels in English, content in Vietnamese, no extra text.`;

  console.log('[AI] calling provider:', config.provider, 'model:', config.model);

  if (config.provider === 'anthropic') {
    return callAnthropic(config.apiKey, config.model, prompt);
  }

  return callOpenAI(config.apiKey, config.model, config.baseUrl || 'https://api.openai.com', prompt);
};
