import fs from 'node:fs';
import { Bot } from 'grammy';
import { ALLOWED_USER_IDS, BOT_TOKEN, WORKSPACE_DIR } from './config.js';
import { runTurn } from './claude.js';
import { clearSession, getSession, setSession } from './sessions.js';
import { LiveMessage } from './telegram.js';
import { ensureMemory, forget, listMemories, readIndex } from './memory.js';

fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
ensureMemory();

const bot = new Bot(BOT_TOKEN);

/** chatId -> { query, busy } for in-flight turns, so /stop can interrupt. */
const inFlight = new Map();

// --- Auth gate -------------------------------------------------------------
// Drop everything from non-whitelisted users without replying, so the bot
// gives no signal that it exists.
bot.use(async (ctx, next) => {
  const id = ctx.from?.id;
  if (!id || !ALLOWED_USER_IDS.has(id)) {
    console.warn(`[auth] rejected user ${id} (@${ctx.from?.username ?? '?'})`);
    return;
  }
  await next();
});

// --- Commands --------------------------------------------------------------
bot.command('start', (ctx) =>
  ctx.reply(
    [
      'Claude Code qua Telegram. Nhắn thẳng câu hỏi là được.',
      '',
      `Sandbox: ${WORKSPACE_DIR}`,
      'Quyền: Read / Edit / Write / Grep / Glob / Web. Không có Bash.',
      '',
      'Bot tự nhớ kinh nghiệm qua các lần chat — /new không xoá memory.',
      '',
      '/new — bắt đầu hội thoại mới',
      '/stop — ngắt lượt đang chạy',
      '/status — xem session hiện tại',
      '/memory — xem bot đang nhớ gì',
      '/remember <text> — bắt nhớ một điều cụ thể',
      '/forget <slug> — xoá một memory',
    ].join('\n'),
  ),
);

bot.command('help', (ctx) =>
  ctx.reply('/new /stop /status /memory /remember /forget — còn lại cứ nhắn bình thường.'),
);

bot.command('new', (ctx) => {
  clearSession(ctx.chat.id);
  return ctx.reply('Đã xoá ngữ cảnh. Bắt đầu hội thoại mới.');
});

bot.command('status', (ctx) => {
  const s = getSession(ctx.chat.id);
  const running = inFlight.has(ctx.chat.id) ? 'đang chạy 1 lượt' : 'rảnh';
  return ctx.reply(
    s
      ? `Session: ${s.sessionId}\nCập nhật: ${s.updatedAt}\nTrạng thái: ${running}`
      : `Chưa có session. Trạng thái: ${running}`,
  );
});

bot.command('stop', async (ctx) => {
  const entry = inFlight.get(ctx.chat.id);
  if (!entry?.query) return ctx.reply('Không có lượt nào đang chạy.');
  try {
    await entry.query.interrupt();
    return ctx.reply('Đã ngắt.');
  } catch (err) {
    return ctx.reply(`Ngắt thất bại: ${err.message}`);
  }
});

// --- Memory commands -------------------------------------------------------
bot.command('memory', (ctx) => {
  const files = listMemories();
  if (files.length === 0) return ctx.reply('Chưa có memory nào.');
  return ctx.reply(`${files.length} memory:\n\n${readIndex().trim()}`);
});

bot.command('forget', (ctx) => {
  const slug = ctx.match?.trim().replace(/\.md$/, '');
  if (!slug) return ctx.reply('Cú pháp: /forget <slug>. Xem slug bằng /memory.');
  return ctx.reply(forget(slug) ? `Đã quên "${slug}".` : `Không thấy memory "${slug}".`);
});

bot.command('remember', (ctx) => {
  const note = ctx.match?.trim();
  if (!note) return ctx.reply('Cú pháp: /remember <điều cần nhớ>');
  return runAndStream(ctx, `Ghi vào bộ nhớ dài hạn: ${note}`);
});

// --- Main chat handler -----------------------------------------------------
bot.on('message:text', (ctx) => runAndStream(ctx, ctx.message.text));

async function runAndStream(ctx, prompt) {
  const chatId = ctx.chat.id;

  if (inFlight.has(chatId)) {
    return ctx.reply('Đang xử lý lượt trước. Đợi xong, hoặc /stop.');
  }

  const live = new LiveMessage(ctx, '⏳ Đang nghĩ…');
  await live.start();
  inFlight.set(chatId, { query: null });

  const typing = setInterval(() => {
    ctx.replyWithChatAction('typing').catch(() => {});
  }, 5000);

  try {
    const stored = getSession(chatId);
    const { sessionId, text, isError } = await runTurn({
      prompt,
      sessionId: stored?.sessionId,
      register: (q) => inFlight.set(chatId, { query: q }),
      onEvent: (e) => {
        if (e.type === 'text') live.append(e.text);
        else if (e.type === 'tool') live.setStatus(`🔧 ${e.toolName}${describe(e.input)}`);
        else if (e.type === 'denied') live.setStatus(`⛔ ${e.toolName} bị chặn`);
        else if (e.type === 'result') live.setStatus('');
      },
    });

    if (sessionId) setSession(chatId, sessionId);
    await live.finish(text || live.body);
    if (isError) await ctx.reply('⚠️ Lượt này kết thúc với lỗi.');
  } catch (err) {
    console.error('[turn] failed:', err);
    await live.finish(`❌ Lỗi: ${err.message}`);
  } finally {
    clearInterval(typing);
    inFlight.delete(chatId);
  }
}

function describe(input) {
  const p = input?.file_path || input?.path || input?.pattern || input?.query;
  return p ? ` ${String(p).split('/').pop()}` : '';
}

bot.catch((err) => console.error('[bot]', err));

console.log(`[bot] workspace: ${WORKSPACE_DIR}`);
console.log(`[bot] allowed users: ${[...ALLOWED_USER_IDS].join(', ')}`);
bot.start({ onStart: (me) => console.log(`[bot] online as @${me.username}`) }).catch((err) => {
  // Under launchd a start failure would otherwise just crash-loop with an
  // opaque stack trace in stderr.log.
  const desc = err.description || err.message;
  if (/unauthorized/i.test(desc)) {
    console.error('[bot] TELEGRAM_BOT_TOKEN sai hoặc đã bị revoke. Lấy token mới từ @BotFather.');
  } else {
    console.error('[bot] không khởi động được:', desc);
  }
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.once(sig, () => bot.stop());
}
