// Prints the Telegram user IDs of anyone who has messaged the bot recently.
// Run once, message the bot, then copy your ID into TELEGRAM_ALLOWED_USER_IDS.
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Set TELEGRAM_BOT_TOKEN in .env first.');
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const data = await res.json();
if (!data.ok) {
  console.error('Telegram error:', data.description);
  process.exit(1);
}
const seen = new Map();
for (const u of data.result) {
  const from = u.message?.from ?? u.edited_message?.from;
  if (from) seen.set(from.id, from.username ?? from.first_name ?? '');
}
if (seen.size === 0) {
  console.log('Chưa có tin nhắn nào. Nhắn cho bot 1 câu rồi chạy lại.');
} else {
  for (const [id, name] of seen) console.log(`${id}\t${name}`);
}
