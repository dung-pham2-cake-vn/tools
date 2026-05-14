import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { getConfig } from '../models/AppConfig';

interface AIConfig {
  provider: 'anthropic' | 'openai' | 'custom' | 'custom_claude';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const DEFAULT_MAX_OUTPUT_TOKENS = 65536; // Increased default max tokens

const getMaxOutputTokens = (): number => {
  const value = Number(process.env.AI_MAX_OUTPUT_TOKENS);
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return DEFAULT_MAX_OUTPUT_TOKENS;
};

export const getAIConfig = async (): Promise<AIConfig | null> => {
  return getConfig('ai_config');
};

const callAnthropic = async (apiKey: string, model: string, prompt: string, baseUrl?: string): Promise<string> => {
  const client = new Anthropic({ apiKey, baseURL: baseUrl?.trim() || undefined });
  const maxTokens = getMaxOutputTokens();
  let responseText = '';

  try {
    const stream = await client.messages.create({
      model: model || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      stream: true, // Enable streaming
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        responseText += chunk.text;
      }
    }
  } catch (error) {
    console.error('[AI] Anthropic API error:', error);
    throw new Error('Failed to call Anthropic API with streaming');
  }

  if (!responseText) {
    throw new Error('No content received from Anthropic API');
  }

  return responseText;
};

const callOpenAI = async (apiKey: string, model: string, baseUrl: string, prompt: string): Promise<string> => {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const maxTokens = getMaxOutputTokens();
  let response;

  try {
    response = await axios.post(
      url,
      {
        model: model || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant. /no_think' },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        chat_template_kwargs: { enable_thinking: false },
      },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AI] OpenAI API error:', error);
    throw new Error('Failed to call OpenAI API');
  }

  const msg = response.data.choices?.[0]?.message;
  console.log('[AI] OpenAI message keys:', msg ? Object.keys(msg) : 'null');
  console.log('[AI] OpenAI message.content:', JSON.stringify(msg?.content)?.slice(0, 200));

  const text = msg?.content || msg?.reasoning_content || msg?.text;
  const finishReason = response.data.choices?.[0]?.finish_reason;

  if (!text) {
    console.error('[AI] Full message object:', JSON.stringify(msg));
    throw new Error(`No content in response. Message keys: ${msg ? Object.keys(msg).join(', ') : 'null'}`);
  }

  if (finishReason === 'length') {
    console.warn('[AI] WARNING: response truncated by max_tokens. Retrying with adjusted prompt.');
    return callOpenAI(apiKey, model, baseUrl, `${prompt}\n\n[CONTINUED]`);
  }

  return text;
};

export const testAIConfig = async (): Promise<{ ok: boolean; provider: string; model: string; error?: string }> => {
  const config: AIConfig | null = await getAIConfig();
  if (!config?.apiKey) return { ok: false, provider: '', model: '', error: 'Not configured' };

  try {
    const prompt = 'Reply with exactly: OK';
    if (config.provider === 'anthropic' || config.provider === 'custom_claude') {
      if (config.provider === 'custom_claude' && !config.baseUrl?.trim()) {
        throw new Error('Base URL is required for Custom Claude-compatible provider');
      }
      await callAnthropic(config.apiKey, config.model, prompt, config.provider === 'custom_claude' ? config.baseUrl : undefined);
    } else {
      await callOpenAI(config.apiKey, config.model, config.baseUrl || 'https://api.openai.com', prompt);
    }
    return { ok: true, provider: config.provider, model: config.model, error: undefined };
  } catch (err: any) {
    return { ok: false, provider: config.provider, model: config.model, error: err?.message };
  }
};

export const analyzeWithCustomPrompt = async (prompt: string): Promise<string> => {
  const config: AIConfig | null = await getAIConfig();
  if (!config?.apiKey) throw new Error('AI not configured. Go to Settings to configure.');

  if (config.provider === 'anthropic' || config.provider === 'custom_claude') {
    if (config.provider === 'custom_claude' && !config.baseUrl?.trim()) {
      throw new Error('Base URL is required for Custom Claude-compatible provider');
    }
    return callAnthropic(config.apiKey, config.model, prompt, config.provider === 'custom_claude' ? config.baseUrl : undefined);
  }
  return callOpenAI(config.apiKey, config.model, config.baseUrl || 'https://api.openai.com', prompt);
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

  const hasComments = ticketData.comments.length > 0;

  const prompt = `You are analyzing a support ticket. Provide analysis in exactly this format. Keep the 4 label names in English, write content in Vietnamese.

Rules:
- Symptoms: derive from description (what users experienced/reported).
- Root cause, Resolution, Prevention: derive PRIMARILY from comments. If comments exist but lack sufficient information to confirm these, write "Chưa xác định" for those fields. If there are NO comments at all, write "Chưa xác định" for all three fields.
- Do not guess or infer Root cause / Resolution / Prevention from description alone.

${hasComments ? '' : '⚠ No comments available — Root cause, Resolution, Prevention must be "Chưa xác định".'}

Symptoms: <triệu chứng và vấn đề được báo cáo, dựa trên description>
Root cause: <nguyên nhân gốc rễ từ comment, hoặc "Chưa xác định">
Resolution: <cách đã xử lý từ comment, hoặc "Chưa xác định">
Prevention: <cách phòng ngừa từ comment, hoặc "Chưa xác định">

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

  if (config.provider === 'anthropic' || config.provider === 'custom_claude') {
    if (config.provider === 'custom_claude' && !config.baseUrl?.trim()) {
      throw new Error('Base URL is required for Custom Claude-compatible provider');
    }
    return callAnthropic(config.apiKey, config.model, prompt, config.provider === 'custom_claude' ? config.baseUrl : undefined);
  }

  return callOpenAI(config.apiKey, config.model, config.baseUrl || 'https://api.openai.com', prompt);
};
