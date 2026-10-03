// Nhận diện sản phẩm trong tài liệu bằng CẶP (đối tác × loại sản phẩm), không khớp product_id nguyên khối.
// Lý do: tiêu đề thật viết "[Partner][Viettel] - Cashloan", không viết "Viettel_Cashloan".
export const PARTNER = {
  vds:     /(?<![A-Za-z])VDS(?![A-Za-z])|Viettel|VTM|(?<![A-Za-z])VTL(?![A-Za-z])/i,
  cake:    /(?<![A-Za-z])CAKE(?![A-Za-z])|(?<![A-Za-z])Cake(?![A-Za-z])/i,
  vnpay:   /VNPAY|VNPay|Vnpay|(?<![A-Za-z])VNP(?![A-Za-z])/i,
  be:      /(?<![A-Za-z])BeG(?![A-Za-z])|(?<![A-Za-z])BEG(?![A-Za-z])|BeGroup|\bBe[ _-]|\bBE_/i,
  misa:    /MISA|Misa/i,
  mwg:     /(?<![A-Za-z])MWG(?![A-Za-z])|Mobile World|QTV|TGDĐ|TGD/i,
  klp:     /(?<![A-Za-z])KLP(?![A-Za-z])|Kalapa/i,
  vnpost:  /Vnpost|VNPOST|(?<![A-Za-z])VPO(?![A-Za-z])/i,
  zalopay: /ZaloPay|Zalopay|(?<![A-Za-z])ZLP(?![A-Za-z])|(?<![A-Za-z])Zalo(?![A-Za-z])/i,
  ngs:     /(?<![A-Za-z])NGS(?![A-Za-z])/i,
  fpt:     /(?<![A-Za-z])FPT(?![A-Za-z])/i,
  datavn:  /VNHUB|Vnhub|DataVN/i,
  mbf:     /(?<![A-Za-z])MBF(?![A-Za-z])|Mobifone|MobiFone/i,
  fiza:    /FIZA|Fiza/i,
  vnpt:    /(?<![A-Za-z])VNPT(?![A-Za-z])/i,
  gsm:     /(?<![A-Za-z])GSM(?![A-Za-z])|VinFast|Vinfast/i,
  kov:     /(?<![A-Za-z])KOV(?![A-Za-z])|KiotViet|Kiotviet/i,
  lcp:     /(?<![A-Za-z])LCP(?![A-Za-z])|Long Châu/i,
};
export const TYPE = {
  cashloan:  /cash ?loan|(?<![A-Za-z])CL(?![A-Za-z])|vay tiêu dùng|vay tiền mặt/i,
  payday:    /pay ?day|(?<![A-Za-z])PD(?![A-Za-z])|vay ngắn ngày/i,
  paylater:  /pay ?later|(?<![A-Za-z])PL(?![A-Za-z])|ví trả sau|trả sau/i,
  od:        /overdraft|(?<![A-Za-z])OD(?![A-Za-z])|thấu chi/i,
  bikeloan:  /bike ?loan|vay xe/i,
};
// Bổ ngữ tách các biến thể cùng đối tác + cùng loại.
const VARIANT = [
  [/payroll|vay trên lương|Cashloan 2|(?<![A-Za-z])VTL(?![A-Za-z])/i,        'VT_Cashloan_S'],
  [/payroll|Payday 2|(?<![A-Za-z])VUL(?![A-Za-z])/i,                          'VT_Payday_S'],
  [/O2O|VDS-O2O|VTPO/i,                                  'VTPO_cashloan'],
  [/landing ?page|(?<![A-Za-z])LP(?![A-Za-z])[^a-z]|cashloan_LP/i,            'VDS_cashloan_LP'],
  [/ePass|epass/i,                                       'VDS_paylater_epass'],
  [/pension|hưu trí|cl_pension/i,                        'VPO_cl_pension'],
  [/online|cl_online/i,                                  'MWG_cl_online'],
  [/affiliate|(?<![A-Za-z])aff(?![A-Za-z])/i,                                 'CAKE_cl_affiliate'],
  [/(?<![A-Za-z])TD(?![A-Za-z])|thế chấp|secured|ODTD/i,                      'CAKE_overdraft_TD'],
  [/\(Mass\)/i,                                          'VPO_cashloan'],
];
// Cặp (đối tác, loại) -> product_id mặc định khi không có bổ ngữ.
const DEFAULT = {
  'vds|cashloan':'Viettel_Cashloan', 'vds|payday':'PD_Viettel', 'vds|paylater':'VDS_paylater',
  'vds|bikeloan':'VDS_bikeloan',
  'cake|cashloan':'CAKE_cashloan', 'cake|payday':'CAKE_payday', 'cake|od':'CAKE_overdraft',
  'vnpay|cashloan':'VNP_cashloan', 'vnpay|payday':'VNP_payday', 'vnpay|paylater':'VNP_paylater',
  'be|cashloan':'Be_Cashloan', 'be|payday':'BE_payday', 'be|paylater':'BE_paylater',
  'misa|cashloan':'MISA_cashloan',
  'mwg|cashloan':'MWG_cashloan', 'mwg|payday':'MWG_payday', 'mwg|paylater':'MWG_paylater',
  'klp|cashloan':'KLP_cashloan',
  'vnpost|cashloan':'VPO_cashloan',
  'zalopay|cashloan':'ZLP_cashloan', 'zalopay|payday':'ZLP_payday',
  'ngs|cashloan':'NGS_cashloan', 'ngs|payday':'NGS_payday',
  'fpt|paylater':'FPT_paylater',
  'datavn|cashloan':'VNHUB_cashloan',
  'mbf|cashloan':'MBF_cashloan',
  'fiza|cashloan':'FIZA_cashloan', 'fiza|payday':'FIZA_payday',
  'vnpt|payday':'PD_CAKEVNPT_NEW',
  'gsm|bikeloan':'GSM_bikeloan',
  'kov|cashloan':'KOV_cashloan',
  'lcp|paylater':'LCP_paylater',
};

export function matchProducts(title, ctx, body) {
  // Chỉ khớp cặp trên TIÊU ĐỀ rồi mới tới breadcrumb — không bao giờ quét thân.
  // Thân tài liệu nhắc sản phẩm khác để tham chiếu; việc nhận diện theo thân
  // để cho khớp product_id chính xác (phía build-index) lo, vì đó là tín hiệu
  // rõ ràng hơn nhiều so với suy ra từ cặp (đối tác × loại).
  const out = new Set();
  for (const scope of [title, `${title} ${ctx}`]) {
    const ps = Object.entries(PARTNER).filter(([, r]) => r.test(scope)).map(([k]) => k);
    const ts = Object.entries(TYPE).filter(([, r]) => r.test(scope)).map(([k]) => k);
    for (const p of ps) for (const t of ts) {
      const v = VARIANT.find(([r, id]) => r.test(scope) && id.toLowerCase().includes(t === 'od' ? 'overdraft' : t));
      const id = v ? v[1] : DEFAULT[`${p}|${t}`];
      if (id) out.add(id);
    }
    // Chỉ Cake cung cấp Overdraft, nên tài liệu OD không nêu đối tác vẫn quy về Cake.
    if (!out.size && ts.includes('od') && !ps.length) {
      out.add(/(?<![A-Za-z])TD(?![A-Za-z])|thế chấp|secured|ODTD/i.test(scope) ? 'CAKE_overdraft_TD' : 'CAKE_overdraft');
    }
    if (out.size) break;                    // đủ tín hiệu ở tiêu đề thì không cần quét body
  }
  return [...out];
}
