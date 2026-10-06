/**
 * Sinh report tổng quan ticket support PL (HTML tĩnh, tự chứa).
 *
 * Nguồn dữ liệu: collection `supporttickets` (tab "PL Tickets" của /support) — được
 * scan từ JQL `project in (PL, PLO, DOP) AND created >= -365d AND (issueLinkType = "causes"
 * or (type = Bug and labels not in (NON_PROD, auto_stage))) AND type in (Task, Bug)`.
 *
 * Script CHỈ ĐỌC database, không ghi gì. Không phụ thuộc / không sửa code web.
 *
 * Chạy:  npx ts-node --transpile-only -P tsconfig.json reports/generate-pl-support-report.ts
 * Kết quả: reports/pl-support-report.html
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { SupportTicket } from '../src/models/SupportTicket';
import { SvkHistory } from '../src/models/SvkHistory';

// ── phân loại ────────────────────────────────────────────────────────────────
// Mỗi ticket được cho điểm trên từng nhóm lỗi: keyword khớp ở title tính 3 điểm,
// ở description tính 1 điểm. Nhóm điểm cao nhất là nhóm chính (mỗi ticket 1 nhóm,
// nên tổng tần suất = tổng số ticket). Thứ tự trong mảng dùng để phá thế hoà.

interface Category {
  id: string;
  label: string;
  desc: string;
  kw: RegExp[];
}

const CATEGORIES: Category[] = [
  {
    id: 'disbursement',
    label: 'Giải ngân & active khoản vay',
    desc: 'Khoản vay đã ký nhưng không giải ngân được, gãy luồng giải ngân, treo tiền ở loan drawdown, retry giải ngân thất bại, phải active/giải ngân thủ công.',
    kw: [/giải ngân/i, /giản ngân/i, /gãy luồng/i, /drawdown/i, /disburse/i, /\bactive\b/i, /activate/i, /chờ giải ngân/i, /retry/i, /thử giải ngân lại/i, /gửi lại yêu cầu/i, /\bgn đầu\b/i],
  },
  {
    id: 'status_sync',
    label: 'Lệch / treo trạng thái khoản vay',
    desc: 'Trạng thái khoản vay lệch giữa Cake và đối tác (VDS/ICE/Mambu), treo ở USER_SIGN hoặc EKYC_SUCCESS, phải update trạng thái bằng tay.',
    kw: [/lệch trạng thái/i, /lệch trạng thái 2 bên/i, /đồng bộ trạng thái/i, /cập nhật trạng thái/i, /update (status|trạng thái|disburse status)/i, /user[_ ]sign/i, /ekyc_success/i, /kiểm tra trạng thái/i, /trạng thái khoản vay/i, /change status/i, /đẩy lại trạng thái/i, /không change status/i],
  },
  {
    id: 'repayment',
    label: 'Thanh toán & gạch nợ',
    desc: 'Khách đã trả tiền nhưng hệ thống chưa gạch nợ / vẫn quá hạn, thanh toán không ghi nhận, lệch dư nợ, giao dịch repayment timeout.',
    kw: [/gạch nợ/i, /thanh toán/i, /repayment/i, /quá hạn/i, /dư nợ/i, /nhắc nợ/i, /quét nợ/i, /prepayment/i, /cắt nợ/i, /over ?due/i, /trả nợ/i],
  },
  {
    id: 'settlement',
    label: 'Tất toán & đóng khoản vay',
    desc: 'Tất toán trước hạn lỗi, khoản vay đã trả hết nhưng không đóng, force close, đóng tài khoản trên Mambu/ICE.',
    kw: [/tất toán/i, /đóng khoản vay/i, /force close/i, /close .*(loan|account)/i, /không đóng/i, /terminat/i, /\bthn\b/i, /đóng sổ/i],
  },
  {
    id: 'onboarding',
    label: 'Đăng ký vay & eKYC',
    desc: 'Không đăng ký được khoản vay, rớt ở bước eKYC/chụp CCCD, màn hình trắng, precheck rule chặn sai, chưa được cấp hạn mức, gen link đăng ký lỗi.',
    kw: [/đăng ký/i, /đăng kí/i, /ekyc/i, /cccd/i, /màn hình trắng/i, /precheck/i, /hạn mức/i, /gen link/i, /client-create/i, /create-token/i, /xét duyệt/i, /từ chối/i, /webview/i, /kết nối thất bại/i],
  },
  {
    id: 'contract',
    label: 'Ký hợp đồng & OTP',
    desc: 'Ký hợp đồng thất bại, không nhận được OTP / OTP không hợp lệ, không hiển thị được nội dung hợp đồng.',
    kw: [/ký hợp đồng/i, /ký hđ/i, /kí hđ/i, /hợp đồng/i, /\botp\b/i, /sign-cakapp/i, /signing/i, /contract/i],
  },
  {
    id: 'cancellation',
    label: 'Hủy khoản vay / hủy trả góp',
    desc: 'Hủy khoản vay trên tool OPS báo lỗi, hủy trả góp không thành công, khoản vay đã hủy vẫn phát sinh nghiệp vụ.',
    kw: [/hủy/i, /huỷ/i, /cancel/i],
  },
  {
    id: 'paylater',
    label: 'Ví trả sau & trả góp',
    desc: 'Ví trả sau (paylater): revert giao dịch không hoàn tiền, quét QR thanh toán lỗi, chuyển đổi trả góp thất bại, dư nợ ví sai.',
    kw: [/ví trả sau/i, /paylater/i, /pay ?later/i, /trả góp/i, /revert/i, /\bqr\b/i, /quét qr/i, /\bví\b/i],
  },
  {
    id: 'reconciliation',
    label: 'Đối soát, GL & giao dịch treo',
    desc: 'Đối soát với VDS/VPBank, GL suspend, giao dịch treo/timeout, accounting state, check giao dịch theo ngày.',
    kw: [/đối soát/i, /\bgl\b/i, /suspend/i, /accounting/i, /\bobs\b/i, /timeout/i, /check (gd|kq gd)/i, /giao dịch/i, /in-process/i, /mambu/i],
  },
  {
    id: 'api_error',
    label: 'Lỗi API đối tác & mã lỗi',
    desc: 'API giữa Cake và đối tác trả mã lỗi (9000000, 900002, 500001, 400001, 200001…), connection refused, callback thất bại, response type sai.',
    kw: [/\bapi\b/i, /mã lỗi/i, /error code/i, /connection refused/i, /(?:lỗi|error|code)[^0-9a-zA-Z]{0,6}\d{4,7}/i, /response type/i, /callback/i, /request type/i, /\bcode"?:/i],
  },
  {
    id: 'ops_tool',
    label: 'Tool nội bộ OPS / Cake Task',
    desc: 'Lỗi trên tool vận hành: Cake Task, tool gạch nợ, Lending Force Close Loan, phân quyền, download template, patch dữ liệu.',
    kw: [/cake ?task/i, /ops tool/i, /tool ops/i, /\btool\b/i, /patch/i, /template/i, /phân quyền/i, /cake_task_group/i],
  },
  {
    id: 'statement_display',
    label: 'Sao kê & hiển thị thông tin',
    desc: 'Không xuất được sao kê, sao kê sai, app không hiển thị / hiển thị sai chi tiết khoản vay, thông tin KH sai.',
    kw: [/sao kê/i, /hiển thị/i, /hiện số thẻ/i, /không tìm thấy khoản vay/i, /lịch sử khoản vay/i, /thông tin (tài khoản|khoản vay|địa chỉ)/i, /không có thông tin/i],
  },
  {
    id: 'fee_insurance',
    label: 'Phí, lãi & bảo hiểm',
    desc: 'Phí bảo hiểm tính sai / thiếu bảo hiểm, lãi OD sai, số tiền giải ngân gồm cả phí bảo hiểm.',
    kw: [/bảo hiểm/i, /insurance/i, /\bphí\b/i, /\blãi\b/i, /số tiền cần thanh toán/i],
  },
  {
    id: 'noise',
    label: 'Ticket rác / test tự động',
    desc: 'Ticket test, ticket do automation tạo — giữ lại để thấy độ nhiễu của dữ liệu, không phải việc thật.',
    kw: [/^\s*test\s*$/i, /^\[auto\]/i],
  },
];

const OTHER: Category = { id: 'other', label: 'Chưa phân loại được', desc: 'Title/description quá ngắn (chỉ có mã khoản vay hoặc số điện thoại) nên không suy ra được nhóm lỗi.', kw: [] };

const PARTNERS: { id: string; label: string; kw: RegExp[] }[] = [
  { id: 'viettel', label: 'Viettel', kw: [/viettel/i, /\bvt\b/i, /CAKECLVIETTEL/i, /CAKEPDVIETTEL/i, /\bvtm\b/i] },
  { id: 'mwg', label: 'MWG (TGDĐ)', kw: [/\bmwg/i, /mwgcl/i, /mwgpl/i, /mgwpl/i, /muwg/i, /CAKECLMWG/i, /CAKECLQTV/i] },
  { id: 'zalopay', label: 'ZaloPay', kw: [/zalopay/i, /\bzlp\b/i, /zlpcl/i, /CAKECLZLP/i] },
  { id: 'vnpay', label: 'VNPay', kw: [/vnpay/i, /\bvnp\b/i, /CAKECLVNP/i, /CAKEPDVNP/i] },
  { id: 'be', label: 'BE', kw: [/\bbe[_ ](cashloan|paylater|payday)/i, /\bbe cashloan/i, /\bbe paylater/i, /CAKECLBE/i, /be_cashloan/i, /be paylater/i] },
  { id: 'vnpost', label: 'VNPost / VPO', kw: [/vnpost/i, /\bvpo\b/i, /postpay/i, /vpo_cl/i] },
  { id: 'vds', label: 'VDS / VPBank', kw: [/\bvds\b/i, /vpbank/i] },
  { id: 'cake', label: 'Cake (kênh trực tiếp)', kw: [/cake[_ ](cashloan|payday|cl_affiliate)/i, /CAKECLCAKE/i, /\bCAKEPD\d/i, /cake payday/i, /cake cashloan/i] },
  { id: 'misa', label: 'MISA', kw: [/misa/i] },
  { id: 'klp', label: 'KLP', kw: [/\bklp\b/i, /CAKECLKLP/i] },
  { id: 'od_td', label: 'OD / TD (nội bộ)', kw: [/\bod[- _]?td\b/i, /vay od\b/i, /khoản vay od\b/i, /CAKEOD/i, /sổ (gửi )?tích lũy/i, /tiết kiệm/i] },
];

const PRODUCTS: { id: string; label: string; kw: RegExp[] }[] = [
  { id: 'cashloan', label: 'Cashloan', kw: [/cashloan/i, /\bcl\b/i, /CAKECL/i, /cl_online/i, /cl_pension/i] },
  { id: 'payday', label: 'Payday', kw: [/payday/i, /\bpd\b/i, /CAKEPD/i] },
  { id: 'paylater', label: 'Paylater / Ví trả sau', kw: [/paylater/i, /ví trả sau/i, /CAKEPL/i, /\bpl\b(?![-\d])/i] },
  { id: 'od_td', label: 'OD / TD', kw: [/\bod[- _]?td\b/i, /khoản vay od\b/i, /CAKEOD/i, /ứng (tiền|trước)/i] },
];

/** Ticket đòi Tech tác động trực tiếp vào dữ liệu / chạy tay thay vì fix code. */
const MANUAL_KW = [/hỗ trợ (active|giải ngân|gạch nợ|tất toán|đóng|đẩy)/i, /\bactive (khoản vay|lại|và)/i, /activate loan/i, /bằng tay/i, /thủ công/i, /patch/i, /update (status|trạng thái|disburse)/i, /cập nhật trạng thái/i, /gạch nợ/i, /retry/i, /thử giải ngân lại/i, /gửi lại yêu cầu/i, /force close/i, /chuyển trạng thái/i];

const CLOSED_STATUSES = ['Invalid', 'Test Passed', 'Done'];

const norm = (s: string) => (s || '').replace(/\s+/g, ' ').trim();

function classify(title: string, description: string): string {
  const t = norm(title);
  const d = norm(description).slice(0, 4000);
  let best = OTHER.id;
  let bestScore = 0;
  for (const c of CATEGORIES) {
    let score = 0;
    for (const re of c.kw) {
      if (re.test(t)) score += 3;
      if (re.test(d)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = c.id;
    }
  }
  return bestScore > 0 ? best : OTHER.id;
}

function tagList(text: string, defs: { id: string; label: string; kw: RegExp[] }[]): string[] {
  return defs.filter((p) => p.kw.some((re) => re.test(text))).map((p) => p.id);
}

/** Mã lỗi chỉ được nhận khi đứng cạnh từ khoá lỗi — tránh nhận nhầm loan id / số điện thoại. */
function errorCodes(text: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /(?:mã lỗi|lỗi|error(?: code)?|code)[^0-9a-zA-Z]{0,12}(\d{4,8})/gi,
    /"code"\s*:\s*(\d{4,8})/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const code = m[1];
      if (/^(19|20|26)\d{2}$/.test(code)) continue; // năm
      found.add(code);
    }
  }
  return [...found];
}

// ── gom nhóm ticket lặp lại (ứng viên tự động hoá) ───────────────────────────

const CLUSTER_STOP = new Set([
  'khoản', 'vay', 'kiểm', 'tra', 'hỗ', 'trợ', 'cho', 'các', 'với', 'khi', 'này', 'lỗi', 'bị', 'không', 'được', 'của', 'trên', 'case',
  'kh', 'the', 'and', 'for', 'check', 'loan', 'id', 'phone', 'ngày', 'nhưng', 'đã', 'và', 'là', 'có', 'ở', 'tại', 'từ', 'về', 'do',
]);

function clusterTokens(title: string): Set<string> {
  const cleaned = norm(title)
    .toUpperCase()
    .replace(/CAKE[A-Z]*\d+/g, ' ')       // mã khoản vay
    .replace(/\b0\d{8,10}\b/g, ' ')        // số điện thoại
    .replace(/\b\d{4,}\b/g, ' ')           // loan id / case id
    .replace(/\(\s*CASE[^)]*\)/gi, ' ')
    .toLowerCase();
  return new Set(
    cleaned
      .split(/[^a-zà-ỹ0-9]+/i)
      .filter((w) => w.length >= 2 && !CLUSTER_STOP.has(w))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

interface Cluster {
  label: string;
  tokens: Set<string>;
  keys: string[];
  months: Set<string>;
  manual: number;
}

function buildClusters(rows: { key: string; title: string; month: string; manual: boolean }[]): Cluster[] {
  const clusters: Cluster[] = [];
  for (const r of rows) {
    const tokens = clusterTokens(r.title);
    if (tokens.size < 2) continue;
    let hit: Cluster | undefined;
    let bestSim = 0;
    for (const c of clusters) {
      const sim = jaccard(tokens, c.tokens);
      if (sim >= 0.55 && sim > bestSim) {
        bestSim = sim;
        hit = c;
      }
    }
    if (hit) {
      hit.keys.push(r.key);
      hit.months.add(r.month);
      if (r.manual) hit.manual++;
      // giữ title ngắn nhất làm nhãn — thường là dạng chuẩn của nhóm
      if (norm(r.title).length < hit.label.length) hit.label = norm(r.title);
    } else {
      clusters.push({ label: norm(r.title), tokens, keys: [r.key], months: new Set([r.month]), manual: r.manual ? 1 : 0 });
    }
  }
  return clusters.filter((c) => c.keys.length >= 3).sort((a, b) => b.keys.length - a.keys.length);
}

// ── thống kê ─────────────────────────────────────────────────────────────────

const median = (arr: number[]) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

(async () => {
  await connectDatabase();

  const raw = await SupportTicket.find()
    .select('key title description status priority assignee sprint type created updated comments hyperlink')
    .lean();

  const tickets = raw
    .filter((t) => t.created)
    .map((t) => {
      const title = norm(t.title);
      const description = norm(t.description);
      const blob = `${title} ${description}`;
      const created = new Date(t.created as any);
      const updated = t.updated ? new Date(t.updated as any) : created;
      const closed = CLOSED_STATUSES.includes(t.status || '');
      return {
        key: t.key,
        title,
        hyperlink: t.hyperlink || '',
        status: t.status || '(trống)',
        priority: t.priority || '(trống)',
        assignee: t.assignee || '(chưa gán)',
        sprint: t.sprint || '',
        category: classify(title, description),
        partners: tagList(blob, PARTNERS),
        products: tagList(blob, PRODUCTS),
        codes: errorCodes(blob),
        manual: MANUAL_KW.some((re) => re.test(blob)),
        comments: (t.comments || []).length,
        created,
        updated,
        month: monthKey(created),
        closed,
        days: closed ? Math.max(0, (updated.getTime() - created.getTime()) / 86400000) : null,
        ageDays: closed ? null : Math.max(0, (Date.now() - created.getTime()) / 86400000),
      };
    })
    .sort((a, b) => b.created.getTime() - a.created.getTime());

  const catMeta = new Map([...CATEGORIES, OTHER].map((c) => [c.id, c]));
  const count = <T>(items: T[], keyFn: (x: T) => string[] | string) => {
    const m = new Map<string, number>();
    for (const it of items) {
      const ks = keyFn(it);
      for (const k of Array.isArray(ks) ? ks : [ks]) m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byCategory = count(tickets, (t) => t.category);
  const byPartner = count(tickets, (t) => (t.partners.length ? t.partners : ['unknown']));
  const byProduct = count(tickets, (t) => (t.products.length ? t.products : ['unknown']));
  const byStatus = count(tickets, (t) => t.status);
  const byAssignee = count(tickets, (t) => t.assignee);
  const byCode = count(tickets, (t) => t.codes).filter(([, c]) => c >= 2);
  const byMonth = count(tickets, (t) => t.month).sort((a, b) => a[0].localeCompare(b[0]));

  // heatmap loại lỗi × đối tác (chỉ top đối tác + top nhóm lỗi để đọc được)
  const topCats = byCategory.slice(0, 8).map(([id]) => id);
  const topPartners = byPartner.filter(([id]) => id !== 'unknown').slice(0, 7).map(([id]) => id);
  const heat = topCats.map((cid) => ({
    cat: cid,
    cells: topPartners.map((pid) => tickets.filter((t) => t.category === cid && t.partners.includes(pid)).length),
  }));

  // nhóm lỗi × tháng cho biểu đồ xu hướng (top 3 nhóm + gộp phần còn lại)
  const trendCats = byCategory.slice(0, 3).map(([id]) => id);
  const trend = byMonth.map(([m]) => ({
    month: m,
    values: [
      ...trendCats.map((cid) => tickets.filter((t) => t.month === m && t.category === cid).length),
      tickets.filter((t) => t.month === m && !trendCats.includes(t.category)).length,
    ],
  }));

  const catStats = byCategory.map(([id, n]) => {
    const rows = tickets.filter((t) => t.category === id);
    const closedRows = rows.filter((r) => r.days !== null);
    return {
      id,
      label: catMeta.get(id)?.label || id,
      desc: catMeta.get(id)?.desc || '',
      n,
      pct: (n / tickets.length) * 100,
      manual: rows.filter((r) => r.manual).length,
      open: rows.filter((r) => !r.closed).length,
      medianDays: median(closedRows.map((r) => r.days as number)),
      avgComments: rows.length ? rows.reduce((s, r) => s + r.comments, 0) / rows.length : 0,
      examples: rows.slice(0, 4).map((r) => ({ key: r.key, title: r.title, url: r.hyperlink, status: r.status })),
    };
  });

  const clusters = buildClusters(tickets.map((t) => ({ key: t.key, title: t.title, month: t.month, manual: t.manual })))
    .slice(0, 15)
    .map((c) => ({ label: c.label, n: c.keys.length, months: c.months.size, manual: c.manual, keys: c.keys.slice(0, 6) }));

  const openTickets = tickets.filter((t) => !t.closed);
  const closedAll = tickets.filter((t) => t.days !== null);
  const svkCount = await SvkHistory.countDocuments();
  const svkLinked = await SvkHistory.aggregate([
    { $project: { has: { $gt: [{ $size: { $ifNull: ['$linkedPlKeys', []] } }, 0] } } },
    { $group: { _id: '$has', c: { $sum: 1 } } },
  ]);

  const monthsSpan = byMonth.length || 1;
  const kpi = {
    total: tickets.length,
    from: byMonth[0]?.[0] || '',
    to: byMonth[byMonth.length - 1]?.[0] || '',
    perMonth: tickets.length / monthsSpan,
    manualPct: (tickets.filter((t) => t.manual).length / tickets.length) * 100,
    medianDays: median(closedAll.map((t) => t.days as number)),
    p90Days: (() => {
      const s = closedAll.map((t) => t.days as number).sort((a, b) => a - b);
      return s.length ? s[Math.floor(s.length * 0.9)] : 0;
    })(),
    open: openTickets.length,
    openOld: openTickets.filter((t) => (t.ageDays as number) > 30).length,
    invalidPct: ((byStatus.find(([s]) => s === 'Invalid')?.[1] || 0) / tickets.length) * 100,
    noComment: (tickets.filter((t) => t.comments === 0).length / tickets.length) * 100,
    svkCount,
    svkWithPl: svkLinked.find((x: any) => x._id === true)?.c || 0,
  };

  const labelOf = (defs: { id: string; label: string }[], id: string) =>
    defs.find((d) => d.id === id)?.label || (id === 'unknown' ? 'Không xác định' : id);

  const data = {
    generatedAt: new Date().toISOString(),
    kpi,
    categories: catStats,
    trend: { months: trend.map((t) => t.month), series: [...trendCats.map((c) => catMeta.get(c)?.label || c), 'Nhóm còn lại'], values: trend.map((t) => t.values) },
    byMonth: byMonth.map(([m, n]) => ({ m, n })),
    byPartner: byPartner.map(([id, n]) => ({ label: labelOf(PARTNERS, id), n })),
    byProduct: byProduct.map(([id, n]) => ({ label: labelOf(PRODUCTS, id), n })),
    byStatus: byStatus.map(([s, n]) => ({ label: s, n })),
    byAssignee: byAssignee.slice(0, 12).map(([a, n]) => ({ label: a, n })),
    byCode: byCode.map(([c, n]) => ({ label: c, n })),
    heat: { cats: topCats.map((c) => catMeta.get(c)?.label || c), partners: topPartners.map((p) => labelOf(PARTNERS, p)), rows: heat.map((h) => h.cells) },
    clusters,
    oldestOpen: openTickets
      .sort((a, b) => (b.ageDays as number) - (a.ageDays as number))
      .slice(0, 10)
      .map((t) => ({ key: t.key, title: t.title, url: t.hyperlink, status: t.status, age: Math.round(t.ageDays as number), cat: catMeta.get(t.category)?.label || t.category })),
  };

  const html = renderHtml(data);
  const out = path.join(__dirname, 'pl-support-report.html');
  fs.writeFileSync(out, html, 'utf8');

  console.log(`[report] ${tickets.length} ticket, ${byMonth.length} tháng (${kpi.from} → ${kpi.to})`);
  console.log('[report] nhóm lỗi:', catStats.map((c) => `${c.label}=${c.n}`).join(' | '));
  console.log('[report] đối tác:', data.byPartner.map((p) => `${p.label}=${p.n}`).join(' | '));
  console.log('[report] cluster:', clusters.slice(0, 6).map((c) => `${c.n}× ${c.label.slice(0, 45)}`).join(' | '));
  console.log(`[report] file: ${out}`);

  await disconnectDatabase();
  process.exit(0);
})().catch((e) => {
  console.error('[report] FAILED', e);
  process.exit(1);
});

// ── render HTML ──────────────────────────────────────────────────────────────

function renderHtml(d: any): string {
  const json = JSON.stringify(d).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Report ticket support PL — tổng quan loại lỗi & tần suất</title>
<script>
  // đặt theme trước khi render để SVG lấy đúng biến màu
  var h = location.hash;
  if (h === '#dark' || h === '#light') document.documentElement.setAttribute('data-theme', h.slice(1));
</script>
<style>
:root {
  color-scheme: light;
  --surface-0: #f4f3f0;
  --surface-1: #fcfcfb;
  --surface-2: #efeeea;
  --border: #dcdad2;
  --text-primary: #0b0b0b;
  --text-secondary: #52514e;
  --text-muted: #7a7973;
  --series-1: #2a78d6;
  --series-2: #eb6834;
  --series-3: #1baf7a;
  --series-4: #eda100;
  --series-5: #9a9791;
  /* ramp ordinal 4 bậc: nhỏ → lớn (đã qua validator: ΔL >= 0.06, đầu nhạt >= 2:1) */
  --seq-1: #86b6ef;
  --seq-2: #3987e5;
  --seq-3: #1c5cab;
  --seq-4: #0d366b;
  --ink-1: #0b0b0b;
  --ink-2: #ffffff;
  --ink-3: #ffffff;
  --ink-4: #ffffff;
  --good: #1baf7a;
  --warn: #eda100;
  --crit: #e34948;
  --grid: #e5e3dd;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --surface-0: #121211;
    --surface-1: #1a1a19;
    --surface-2: #232322;
    --border: #383835;
    --text-primary: #ffffff;
    --text-secondary: #c3c2b7;
    --text-muted: #918f86;
    --series-1: #3987e5;
    --series-2: #d95926;
    --series-3: #199e70;
    --series-4: #c98500;
    --series-5: #6f6d67;
    --seq-1: #184f95;
    --seq-2: #256abf;
    --seq-3: #3987e5;
    --seq-4: #6da7ec;
    --ink-1: #ffffff;
    --ink-2: #ffffff;
    --ink-3: #ffffff;
    --ink-4: #0b0b0b;
    --grid: #2e2e2c;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --surface-0: #121211;
  --surface-1: #1a1a19;
  --surface-2: #232322;
  --border: #383835;
  --text-primary: #ffffff;
  --text-secondary: #c3c2b7;
  --text-muted: #918f86;
  --series-1: #3987e5;
  --series-2: #d95926;
  --series-3: #199e70;
  --series-4: #c98500;
  --series-5: #6f6d67;
  --seq-1: #184f95;
  --seq-2: #256abf;
  --seq-3: #3987e5;
  --seq-4: #6da7ec;
  --ink-1: #ffffff;
  --ink-2: #ffffff;
  --ink-3: #ffffff;
  --ink-4: #0b0b0b;
  --grid: #2e2e2c;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0 0 64px;
  background: var(--surface-0);
  color: var(--text-primary);
  font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
header { padding: 40px 0 28px; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
h1 { font-size: 30px; line-height: 1.2; margin: 0 0 8px; letter-spacing: -0.01em; }
h2 { font-size: 20px; margin: 44px 0 6px; letter-spacing: -0.01em; }
h3 { font-size: 15px; margin: 24px 0 8px; }
p.sub { color: var(--text-secondary); margin: 0; font-size: 14px; }
.meta { color: var(--text-muted); font-size: 13px; margin-top: 12px; }
.note { color: var(--text-secondary); font-size: 13.5px; margin: 8px 0 16px; }
.card { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-top: 16px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(168px, 1fr)); gap: 12px; margin-top: 20px; }
.kpi { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
.kpi .v { font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
.kpi .l { font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; }
.kpi .h { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
th { color: var(--text-secondary); font-weight: 600; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.03em; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
tbody tr:hover { background: var(--surface-2); }
a { color: var(--series-1); text-decoration: none; }
a:hover { text-decoration: underline; }
.scroll { overflow-x: auto; }
.legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 4px 0 12px; font-size: 12.5px; color: var(--text-secondary); }
.legend i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; margin-right: 6px; vertical-align: -1px; }
.tip {
  position: fixed; pointer-events: none; z-index: 20; opacity: 0; transition: opacity .1s;
  background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px;
  padding: 8px 10px; font-size: 12.5px; box-shadow: 0 6px 22px rgba(0,0,0,.16); max-width: 300px;
}
.tip b { font-weight: 600; }
.bars { display: grid; gap: 6px; }
.bar-row { display: grid; grid-template-columns: minmax(120px, 210px) 1fr 52px; gap: 10px; align-items: center; font-size: 13px; }
.bar-row .lb { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-track { background: var(--surface-2); border-radius: 4px; height: 18px; position: relative; }
.bar-fill { height: 18px; border-radius: 0 4px 4px 0; }
.bar-row .vl { text-align: right; font-variant-numeric: tabular-nums; color: var(--text-primary); }
.hm { border-collapse: separate; border-spacing: 2px; font-size: 12.5px; }
.hm th { border: 0; padding: 4px 6px; font-size: 11.5px; }
.hm td { border: 0; padding: 0; }
.hm .cell { width: 100%; min-width: 54px; height: 30px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-variant-numeric: tabular-nums; }
.hm th.rowh { text-align: right; color: var(--text-secondary); font-weight: 400; text-transform: none; letter-spacing: 0; max-width: 210px; }
.pill { display: inline-block; font-size: 11.5px; padding: 1px 7px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-secondary); }
.pill.manual { border-color: var(--warn); color: var(--warn); }
.pill.open { border-color: var(--crit); color: var(--crit); }
.toggle { float: right; font-size: 12.5px; color: var(--text-secondary); background: var(--surface-1); border: 1px solid var(--border); border-radius: 6px; padding: 5px 10px; cursor: pointer; }
details { margin-top: 8px; }
summary { cursor: pointer; color: var(--text-secondary); font-size: 13px; }
ul.tight { margin: 6px 0 0; padding-left: 20px; color: var(--text-secondary); font-size: 13.5px; }
ul.tight li { margin-bottom: 4px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 820px) { .grid2 { grid-template-columns: 1fr; } .bar-row { grid-template-columns: minmax(96px,150px) 1fr 44px; } }
figcaption { font-size: 12.5px; color: var(--text-muted); margin-top: 10px; }
</style>
</head>
<body>
<div class="wrap">
<header>
  <button class="toggle" id="themeBtn">Đổi sáng / tối</button>
  <h1>Ticket support PL — team đang xử lý những lỗi gì</h1>
  <p class="sub">Tổng hợp toàn bộ ticket support đang lưu trong hệ thống Tools (project PL / PLO / DOP, loại Task &amp; Bug có link "causes" hoặc là Bug production).</p>
  <p class="meta" id="meta"></p>
</header>

<section>
  <h2>1. Tổng quan</h2>
  <p class="note">Sáu con số đọc trước tiên: khối lượng, mức độ phải can thiệp tay, tốc độ xử lý và tồn đọng.</p>
  <div class="kpis" id="kpis"></div>
</section>

<section>
  <h2>2. Các loại lỗi thường gặp &amp; tần suất</h2>
  <p class="note">Mỗi ticket được gán đúng một nhóm lỗi chính (chấm điểm từ khoá trên title + description), nên tổng tần suất bằng tổng số ticket. Cột <b>tác động tay</b> là số ticket mà Tech phải sửa dữ liệu / chạy tay chứ không phải fix code.</p>
  <div class="card"><div class="bars" id="catBars"></div><figcaption>Số ticket theo nhóm lỗi. Hover để xem tỉ lệ và số ticket còn mở.</figcaption></div>
  <div class="card scroll"><table id="catTable"></table></div>
</section>

<section>
  <h2>3. Xu hướng theo tháng</h2>
  <p class="note">Cột xếp theo 3 nhóm lỗi lớn nhất + phần còn lại. Dữ liệu các tháng cũ nhất bị cắt bởi cửa sổ JQL 365 ngày, đọc phần đuôi mới đáng tin.</p>
  <div class="card"><div class="legend" id="trendLegend"></div><div id="trendChart"></div><figcaption>Số ticket tạo mới mỗi tháng, chia theo nhóm lỗi.</figcaption></div>
</section>

<section>
  <h2>4. Đối tác &amp; dòng sản phẩm</h2>
  <p class="note">Một ticket có thể được gắn nhiều nhãn (ví dụ Viettel + Cashloan), nên tổng ở đây lớn hơn tổng số ticket.</p>
  <div class="grid2">
    <div class="card"><h3>Theo đối tác</h3><div class="bars" id="partnerBars"></div></div>
    <div class="card"><h3>Theo dòng sản phẩm</h3><div class="bars" id="productBars"></div></div>
  </div>
</section>

<section>
  <h2>5. Điểm nóng: nhóm lỗi × đối tác</h2>
  <p class="note">Ô càng đậm càng nhiều ticket — dùng để chọn đối tác/luồng cần ưu tiên làm sạch trước.</p>
  <div class="card scroll"><table class="hm" id="heat"></table><figcaption>Số ticket ở giao điểm nhóm lỗi và đối tác.</figcaption></div>
</section>

<section>
  <h2>6. Nhóm ticket lặp lại — ứng viên tự động hoá</h2>
  <p class="note">Các ticket có title gần giống nhau được gom lại (độ tương đồng từ khoá ≥ 0,55). Nhóm xuất hiện ở nhiều tháng và phần lớn là tác động tay chính là chỗ nên làm tool / job tự động thay vì mở ticket từng lần.</p>
  <div class="card scroll"><table id="clusters"></table></div>
</section>

<section>
  <h2>7. Mã lỗi hay gặp</h2>
  <p class="note">Mã lỗi chỉ được nhận khi nằm cạnh từ khoá "lỗi/error/code" trong nội dung ticket, nên đây là sàn dưới, không phải con số đầy đủ.</p>
  <div class="card"><div class="bars" id="codeBars"></div></div>
</section>

<section>
  <h2>8. Tốc độ xử lý &amp; tồn đọng</h2>
  <p class="note">Thời gian xử lý = ngày <i>updated</i> trừ ngày <i>created</i> của ticket đã đóng (Done / Test Passed / Invalid). Đây là số gần đúng vì Jira không lưu resolutiondate trong dữ liệu đã scan.</p>
  <div class="grid2">
    <div class="card"><h3>Trung vị số ngày xử lý theo nhóm lỗi</h3><div class="bars" id="daysBars"></div></div>
    <div class="card"><h3>Trạng thái ticket</h3><div class="bars" id="statusBars"></div>
      <p class="note" id="invalidNote"></p></div>
  </div>
  <div class="card scroll"><h3>Ticket đang mở lâu nhất</h3><table id="oldest"></table></div>
</section>

<section>
  <h2>9. Tải theo người xử lý</h2>
  <p class="note">Assignee tại thời điểm scan. Tập trung quá nhiều vào một người là rủi ro vận hành, không chỉ là vấn đề khối lượng.</p>
  <div class="card"><div class="bars" id="assigneeBars"></div></div>
</section>

<section>
  <h2>10. Chi tiết từng nhóm lỗi</h2>
  <p class="note">Định nghĩa nhóm + ticket ví dụ để đối chiếu khi bạn muốn kiểm tra cách phân loại.</p>
  <div id="catDetails"></div>
</section>

<section>
  <h2>11. Đọc gì từ report này</h2>
  <p class="note">Các nhận định dưới đây được tính trực tiếp từ dữ liệu ở trên, không phải nhận xét thủ công.</p>
  <div class="card"><ul class="tight" id="insights"></ul></div>
</section>

<section>
  <h2>12. Phương pháp &amp; hạn chế</h2>
  <div class="card">
    <ul class="tight">
      <li><b>Nguồn:</b> collection <code>supporttickets</code> trong MongoDB của Tools — dữ liệu do tab "PL Tickets" của trang /support scan từ Jira.</li>
      <li><b>JQL gốc:</b> <code>project in (PL, PLO, DOP) AND created &gt;= -365d AND (issueLinkType = "causes" or (type = Bug and labels not in (NON_PROD, auto_stage))) AND type in (Task, Bug)</code>. Ticket cũ hơn 365 ngày vẫn còn trong DB từ các lần scan trước nên khoảng thời gian rộng hơn 1 năm, nhưng các tháng đầu <b>không đầy đủ</b>.</li>
      <li><b>Phân loại:</b> theo bộ từ khoá tiếng Việt/tiếng Anh, chấm điểm title (×3) + description (×1), lấy nhóm điểm cao nhất. Không dùng AI nên kết quả tái lập được 100% và có thể sửa quy tắc trong <code>reports/generate-pl-support-report.ts</code>.</li>
      <li><b>Hạn chế:</b> ticket có title chỉ chứa mã khoản vay rơi vào nhóm "Chưa phân loại được"; "Invalid" trong Jira ở đây thường nghĩa là "không phải bug — đã hỗ trợ xong", không phải ticket sai.</li>
      <li><b>Bối cảnh SVK:</b> <span id="svkNote"></span></li>
    </ul>
  </div>
</section>

</div>
<div class="tip" id="tip"></div>
<script id="data" type="application/json">${json}</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const tip = document.getElementById('tip');
const SEQ = ['--seq-1','--seq-2','--seq-3','--seq-4'];
const INK = ['--ink-1','--ink-2','--ink-3','--ink-4'];
const stepOf = (share) => Math.min(SEQ.length - 1, Math.floor(share * (SEQ.length - 0.01)));
const CAT = ['--series-1','--series-2','--series-3','--series-4','--series-5'];
const v = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const n1 = (x) => (Math.round(x * 10) / 10).toLocaleString('vi-VN');
const n0 = (x) => Math.round(x).toLocaleString('vi-VN');

function bindTip(el, html) {
  el.addEventListener('mousemove', (e) => {
    tip.innerHTML = html;
    tip.style.opacity = '1';
    const pad = 14;
    let x = e.clientX + pad, y = e.clientY + pad;
    const r = tip.getBoundingClientRect();
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  });
  el.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
}

/** bar ngang, một hue sequential — đậm dần theo độ lớn */
function bars(el, rows) {
  const max = Math.max(...rows.map(r => r.n), 1);
  el.innerHTML = '';
  rows.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const share = r.n / max;
    const step = SEQ[stepOf(share)];
    row.innerHTML = '<div class="lb" title="' + r.label.replace(/"/g,'&quot;') + '">' + r.label + '</div>'
      + '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(share * 100, 1.5) + '%;background:var(' + step + ')"></div></div>'
      + '<div class="vl">' + (r.display !== undefined ? r.display : n0(r.n)) + '</div>';
    bindTip(row, '<b>' + r.label + '</b><br>' + (r.tip || (n0(r.n) + ' ticket')));
    el.appendChild(row);
  });
}

// ── 1. KPI
document.getElementById('meta').textContent =
  'Sinh lúc ' + new Date(D.generatedAt).toLocaleString('vi-VN') + ' · ' + n0(D.kpi.total)
  + ' ticket · dữ liệu từ ' + D.kpi.from + ' đến ' + D.kpi.to;
const kpis = [
  { v: n0(D.kpi.total), l: 'ticket support', h: D.kpi.from + ' → ' + D.kpi.to },
  { v: n1(D.kpi.perMonth), l: 'ticket / tháng (trung bình)', h: 'trên ' + D.byMonth.length + ' tháng có dữ liệu' },
  { v: n0(D.kpi.manualPct) + '%', l: 'ticket phải tác động tay', h: 'active, gạch nợ, patch, update status…' },
  { v: n1(D.kpi.medianDays) + ' ngày', l: 'trung vị thời gian xử lý (ước lượng)', h: 'P90 ' + n1(D.kpi.p90Days) + ' ngày (created → updated)' },
  { v: n0(D.kpi.open), l: 'ticket đang mở', h: D.kpi.openOld + ' ticket mở quá 30 ngày' },
  { v: n0(D.kpi.invalidPct) + '%', l: 'đóng ở trạng thái Invalid', h: 'phần lớn là "hỗ trợ xong, không phải bug"' },
];
document.getElementById('kpis').innerHTML = kpis.map(k =>
  '<div class="kpi"><div class="v">' + k.v + '</div><div class="l">' + k.l + '</div><div class="h">' + k.h + '</div></div>').join('');
document.getElementById('svkNote').textContent =
  'Hệ thống đang lưu ' + n0(D.kpi.svkCount) + ' ticket SVK (yêu cầu từ OPS/đối tác), trong đó '
  + n0(D.kpi.svkWithPl) + ' ticket có link sang PL. Phần chưa có link PL là yêu cầu được xử lý trực tiếp mà không mở ticket dev.';

// ── 2. nhóm lỗi
bars(document.getElementById('catBars'), D.categories.map(c => ({
  label: c.label, n: c.n,
  tip: n0(c.n) + ' ticket · ' + n1(c.pct) + '% tổng<br>' + n0(c.manual) + ' ticket tác động tay · ' + n0(c.open) + ' đang mở<br>trung vị ' + n1(c.medianDays) + ' ngày',
})));
document.getElementById('catTable').innerHTML =
  '<thead><tr><th>Nhóm lỗi</th><th class="num">Ticket</th><th class="num">%</th><th class="num">Tác động tay</th><th class="num">Đang mở</th><th class="num">Trung vị (ngày)</th><th class="num">Comment/ticket</th></tr></thead><tbody>'
  + D.categories.map(c => '<tr><td>' + c.label + '</td><td class="num">' + n0(c.n) + '</td><td class="num">' + n1(c.pct)
    + '%</td><td class="num">' + n0(c.manual) + '</td><td class="num">' + n0(c.open) + '</td><td class="num">' + n1(c.medianDays)
    + '</td><td class="num">' + n1(c.avgComments) + '</td></tr>').join('') + '</tbody>';

// ── 3. xu hướng (stacked column, SVG)
(function trend() {
  const months = D.trend.months, series = D.trend.series, vals = D.trend.values;
  const W = 1000, H = 300, ml = 34, mr = 8, mt = 12, mb = 42;
  const totals = vals.map(r => r.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals, 1);
  const iw = W - ml - mr, ih = H - mt - mb;
  const bw = Math.min(46, (iw / months.length) * 0.68);
  const step = iw / months.length;
  const y = (val) => mt + ih - (val / max) * ih;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Số ticket theo tháng">';
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = (max / ticks) * i, yy = y(val);
    svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + yy + '" y2="' + yy + '" stroke="' + v('--grid') + '" stroke-width="1"/>';
    svg += '<text x="' + (ml - 7) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="' + v('--text-muted') + '">' + Math.round(val) + '</text>';
  }
  months.forEach((m, i) => {
    const x = ml + step * i + (step - bw) / 2;
    let acc = 0;
    vals[i].forEach((val, si) => {
      if (!val) return;
      const y0 = y(acc + val), y1 = y(acc);
      const h = Math.max(y1 - y0 - 2, 1);
      const first = acc + val >= totals[i] - 0.001;
      svg += '<rect class="seg" data-m="' + i + '" data-s="' + si + '" x="' + x + '" y="' + y0 + '" width="' + bw + '" height="' + h
        + '" rx="' + (first ? 4 : 0) + '" fill="var(' + CAT[si % CAT.length] + ')"/>';
      acc += val;
    });
    svg += '<text x="' + (x + bw / 2) + '" y="' + (y(totals[i]) - 6) + '" text-anchor="middle" font-size="11" fill="' + v('--text-secondary') + '">' + (totals[i] || '') + '</text>';
    svg += '<text x="' + (x + bw / 2) + '" y="' + (H - 22) + '" text-anchor="middle" font-size="10.5" fill="' + v('--text-muted')
      + '" transform="rotate(-40 ' + (x + bw / 2) + ' ' + (H - 22) + ')">' + m + '</text>';
  });
  svg += '</svg>';
  document.getElementById('trendChart').innerHTML = svg;
  document.getElementById('trendLegend').innerHTML = series.map((s, i) =>
    '<span><i style="background:var(' + CAT[i % CAT.length] + ')"></i>' + s + '</span>').join('');
  document.querySelectorAll('#trendChart .seg').forEach(seg => {
    const i = +seg.dataset.m, si = +seg.dataset.s;
    bindTip(seg, '<b>' + months[i] + '</b><br>' + series[si] + ': ' + vals[i][si] + ' ticket<br>tổng tháng: ' + totals[i]);
  });
})();

// ── 4. đối tác / sản phẩm
bars(document.getElementById('partnerBars'), D.byPartner);
bars(document.getElementById('productBars'), D.byProduct);

// ── 5. heatmap
(function heat() {
  const { cats, partners, rows } = D.heat;
  const max = Math.max(...rows.flat(), 1);
  let h = '<thead><tr><th></th>' + partners.map(p => '<th>' + p + '</th>').join('') + '</tr></thead><tbody>';
  rows.forEach((r, ri) => {
    h += '<tr><th class="rowh">' + cats[ri] + '</th>' + r.map((c, ci) => {
      const share = c / max;
      const si = c === 0 ? null : stepOf(share);
      const bg = si === null ? 'var(--surface-2)' : 'var(' + SEQ[si] + ')';
      const fg = si === null ? 'var(--text-muted)' : 'var(' + INK[si] + ')';
      return '<td><div class="cell" data-r="' + ri + '" data-c="' + ci + '" style="background:' + bg + ';color:' + fg + '">' + (c || '·') + '</div></td>';
    }).join('') + '</tr>';
  });
  document.getElementById('heat').innerHTML = h + '</tbody>';
  document.querySelectorAll('#heat .cell').forEach(cell => {
    const ri = +cell.dataset.r, ci = +cell.dataset.c;
    bindTip(cell, '<b>' + cats[ri] + '</b><br>' + partners[ci] + ': ' + rows[ri][ci] + ' ticket');
  });
})();

// ── 6. cluster
document.getElementById('clusters').innerHTML =
  '<thead><tr><th>Nhóm ticket lặp lại</th><th class="num">Lần</th><th class="num">Số tháng</th><th class="num">Tác động tay</th><th>Ticket ví dụ</th></tr></thead><tbody>'
  + D.clusters.map(c => '<tr><td>' + c.label + '</td><td class="num">' + c.n + '</td><td class="num">' + c.months
    + '</td><td class="num">' + c.manual + '</td><td>' + c.keys.join(', ') + '</td></tr>').join('') + '</tbody>';

// ── 7. mã lỗi
bars(document.getElementById('codeBars'), D.byCode.map(c => ({ label: 'Mã ' + c.label, n: c.n })));

// ── 8. thời gian xử lý & trạng thái
bars(document.getElementById('daysBars'), [...D.categories].filter(c => c.n >= 5)
  .sort((a, b) => b.medianDays - a.medianDays)
  .map(c => ({ label: c.label, n: c.medianDays, display: n1(c.medianDays), tip: 'trung vị ' + n1(c.medianDays) + ' ngày trên ' + c.n + ' ticket' })));
bars(document.getElementById('statusBars'), D.byStatus);
document.getElementById('invalidNote').textContent =
  n0(D.kpi.noComment) + '% ticket không có comment nào — phần lớn là ticket được xử lý qua chat rồi đóng, nên lịch sử xử lý không nằm trong Jira.';
document.getElementById('oldest').innerHTML =
  '<thead><tr><th>Ticket</th><th>Nhóm lỗi</th><th>Trạng thái</th><th class="num">Tuổi (ngày)</th></tr></thead><tbody>'
  + D.oldestOpen.map(t => '<tr><td><a href="' + t.url + '" target="_blank" rel="noreferrer">' + t.key + '</a> — ' + t.title
    + '</td><td>' + t.cat + '</td><td>' + t.status + '</td><td class="num">' + t.age + '</td></tr>').join('') + '</tbody>';

// ── 9. assignee
bars(document.getElementById('assigneeBars'), D.byAssignee);

// ── 10. chi tiết nhóm lỗi
document.getElementById('catDetails').innerHTML = D.categories.map(c =>
  '<div class="card"><h3>' + c.label + ' <span class="pill">' + n0(c.n) + ' ticket · ' + n1(c.pct) + '%</span> '
  + (c.manual ? '<span class="pill manual">' + n0(c.manual) + ' tác động tay</span> ' : '')
  + (c.open ? '<span class="pill open">' + n0(c.open) + ' đang mở</span>' : '') + '</h3>'
  + '<p class="note">' + c.desc + '</p>'
  + '<details><summary>Ticket ví dụ</summary><ul class="tight">'
  + c.examples.map(e => '<li><a href="' + e.url + '" target="_blank" rel="noreferrer">' + e.key + '</a> — ' + e.title + ' <span class="pill">' + e.status + '</span></li>').join('')
  + '</ul></details></div>').join('');

// ── 11. nhận định tự sinh
(function insights() {
  const top = D.categories[0], top3 = D.categories.slice(0, 3);
  const share3 = top3.reduce((a, c) => a + c.pct, 0);
  const manualCats = [...D.categories].filter(c => c.n >= 5).sort((a, b) => (b.manual / b.n) - (a.manual / a.n))[0];
  const repeat = D.clusters.reduce((a, c) => a + c.n, 0);
  const repeatManual = D.clusters.reduce((a, c) => a + c.manual, 0);
  const topP = D.byPartner.filter(p => p.label !== 'Không xác định');
  const topAssignee = D.byAssignee.filter(a => a.label !== '(chưa gán)' && a.label !== 'Jira Bot')[0];
  const items = [
    '<b>' + top.label + '</b> là việc chiếm nhiều thời gian nhất: ' + n0(top.n) + ' ticket ('
      + n1(top.pct) + '% tổng), trong đó ' + n0(top.manual) + ' ticket phải tác động dữ liệu bằng tay. '
      + 'Ba nhóm lớn nhất đã chiếm ' + n1(share3) + '% khối lượng — muốn giảm tải thì phải giảm đúng ba nhóm này.',
    '<b>' + n0(D.kpi.manualPct) + '% ticket là vận hành, không phải fix bug</b> (active khoản vay, gạch nợ, update trạng thái, patch dữ liệu). '
      + 'Nhóm nặng nhất theo tỉ lệ là "' + manualCats.label + '" (' + n0(manualCats.manual) + '/' + n0(manualCats.n) + ' ticket).',
    '<b>' + n0(repeat) + ' ticket nằm trong ' + D.clusters.length + ' nhóm lặp lại</b> (' + n0(repeatManual)
      + ' trong đó là tác động tay). Đây là danh sách ứng viên tự động hoá rõ nhất: mỗi nhóm nên thành một job/tool self-service cho OPS thay vì một ticket mới mỗi lần.',
    '<b>Điểm nóng đối tác:</b> ' + topP.slice(0, 3).map(p => p.label + ' (' + p.n + ')').join(', ')
      + ' — riêng ba đối tác này đã chiếm phần lớn ticket; luồng giải ngân và đồng bộ trạng thái với họ là nơi nên đầu tư trước.',
    '<b>Rủi ro tập trung người:</b> ' + topAssignee.label + ' đứng tên ' + topAssignee.n + ' ticket ('
      + n1((topAssignee.n / D.kpi.total) * 100) + '% tổng). Nếu người này nghỉ, phần lớn tri thức xử lý support đi theo.',
    '<b>Chất lượng dữ liệu Jira:</b> ' + n0(D.kpi.invalidPct) + '% ticket đóng ở "Invalid" và ' + n0(D.kpi.noComment)
      + '% không có comment nào — nghĩa là cách xử lý phần lớn ticket không được ghi lại. Bắt buộc ghi nguyên nhân + cách xử lý khi đóng ticket sẽ làm report lần sau nói được cả "vì sao lỗi", chứ không chỉ "lỗi gì".',
  ];
  document.getElementById('insights').innerHTML = items.map(i => '<li>' + i + '</li>').join('');
})();

// ── theme toggle: vẽ lại SVG để lấy màu mới
document.getElementById('themeBtn').addEventListener('click', () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
    || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  location.hash = dark ? '#light' : '#dark';
  location.reload();
});
</script>
</body>
</html>`;
}
