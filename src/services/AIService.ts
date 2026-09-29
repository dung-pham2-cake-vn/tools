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

/** Ảnh gửi kèm prompt (đã đọc sẵn thành base64). */
export interface PromptImage {
  mediaType: string;
  base64: string;
}

const callAnthropic = async (
  apiKey: string,
  model: string,
  prompt: string,
  baseUrl?: string,
  images: PromptImage[] = []
): Promise<string> => {
  const client = new Anthropic({ apiKey, baseURL: baseUrl?.trim() || undefined });
  const maxTokens = getMaxOutputTokens();
  let responseText = '';

  // ảnh đứng trước text: model đọc hình rồi mới tới yêu cầu
  const content: any[] = [
    ...images.map((image) => ({
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType, data: image.base64 },
    })),
    { type: 'text', text: prompt },
  ];

  try {
    const stream = await client.messages.create({
      model: model || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: images.length ? content : prompt }],
      stream: true, // Enable streaming
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        responseText += chunk.delta.text;
      }
    }
  } catch (error: any) {
    console.error('[AI] Anthropic API error:', error);
    // surface the provider's own message (expired key, rate limit, bad model...) to the UI
    const detail = error?.error?.error?.message || error?.message || String(error);
    // "Connection error." của SDK giấu nguyên nhân thật (DNS, TLS, proxy) trong cause
    const cause = error?.cause?.cause?.message || error?.cause?.message || error?.cause?.code;
    throw new Error(`Anthropic API: ${detail}${cause ? ` (${cause})` : ''}`);
  }

  if (!responseText) {
    throw new Error('No content received from Anthropic API');
  }

  return responseText;
};

const callOpenAI = async (
  apiKey: string,
  model: string,
  baseUrl: string,
  prompt: string,
  images: PromptImage[] = []
): Promise<string> => {
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
          {
            role: 'user',
            content: images.length
              ? [
                  ...images.map((image) => ({
                    type: 'image_url',
                    image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
                  })),
                  { type: 'text', text: prompt },
                ]
              : prompt,
          },
        ],
        max_tokens: maxTokens,
        chat_template_kwargs: { enable_thinking: false },
      },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[AI] OpenAI API error:', error);
    const detail =
      error?.response?.data?.error?.message ||
      error?.response?.data?.error ||
      error?.message ||
      String(error);
    const cause = error?.cause?.cause?.message || error?.cause?.message || error?.cause?.code;
    const status = error?.response?.status ? ` [HTTP ${error.response.status}]` : '';
    throw new Error(`OpenAI API${status}: ${detail}${cause ? ` (${cause})` : ''}`);
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

export const analyzeWithCustomPrompt = async (
  prompt: string,
  images: PromptImage[] = []
): Promise<string> => {
  const config: AIConfig | null = await getAIConfig();
  if (!config?.apiKey) throw new Error('AI not configured. Go to Settings to configure.');

  if (config.provider === 'anthropic' || config.provider === 'custom_claude') {
    if (config.provider === 'custom_claude' && !config.baseUrl?.trim()) {
      throw new Error('Base URL is required for Custom Claude-compatible provider');
    }
    return callAnthropic(
      config.apiKey,
      config.model,
      prompt,
      config.provider === 'custom_claude' ? config.baseUrl : undefined,
      images
    );
  }
  return callOpenAI(config.apiKey, config.model, config.baseUrl || 'https://api.openai.com', prompt, images);
};

