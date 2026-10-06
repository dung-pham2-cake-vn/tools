// Bảng tra: feature -> endpoint / error-section / mermaid-flow, cho từng base.
// Sửa base2 thêm/bớt endpoint thì sửa bảng này, `npm run lint` không bắt được.

/** @typedef {'native'|'dop'|'collection'} Model */

export const BASES = {
  native: 'base2/base_native.yaml',
  dop: 'base2/base_dop.yaml',
  collection: 'base2/base_collection.yaml',
};

export const PRODUCTS = ['cashloan', 'payday', 'paylater'];

/** feature -> endpoint, theo từng base. Endpoint không thuộc feature nào -> luôn giữ. */
export const FEATURE_PATHS = {
  native: {
    challenge_otp: ['/challenge-get-otp', '/challenge-verify-otp'],
    challenge_facematch: ['/challenge-facematch'],
    data_config: ['/data-config'],
    onboarding: ['/check-profile', '/client-create', '/client-update', '/loan-register'],
    get_status: ['/get-onboarding-status'],
    loan_detail_api: ['/get-loan-detail'],
    contract: ['/get-esign', '/get-otp', '/verify-esign'],
    contract_cancel: ['/contract-cancel'],
    disburse_update: ['/disburse-update'],
    disburse_request: ['/partner-disburse-request'],
    disburse_status: ['/partner-disburse-status'],
    repayment_request_confirm: ['/repayment-request', '/repayment-confirm'],
    repayment_van: ['/repayment-van'],
    repayment_status: ['/repayment-status'],
    termination: ['/terminate-review', '/terminate-request', '/terminate-confirm', '/terminate-van'],
    payment: ['/payment-request', '/payment-confirm', '/payment-status', '/payment-revert',
              '/get-installment-offers'],
    installment: ['/get-installment-eligible', '/get-installment-offering-list',
                  '/installment-request', '/installment-confirm',
                  '/get-installment-detail', '/get-installment-transactions'],
    cb_update_status: ['/partner-update-status'],
    cb_repayment_status: ['/partner-repayment-status'],
    cb_payment_status: ['/partner-payment-status'],
  },
  dop: {
    onboarding_webview: ['/generate-webview/onboarding'],
    loan_detail_webview: ['/generate-webview/loan-detail'],
    loan_detail_api: ['/get-loan-detail'],
    disburse_update: ['/disburse-update'],
    disburse_request: ['/partner-disburse-request'],
    repayment_request_confirm: ['/repayment-request', '/repayment-confirm'],
    repayment_van: ['/repayment-van'],
    repayment_status: ['/repayment-status'],
    payment: ['/payment-request', '/payment-confirm', '/payment-status', '/payment-revert'],
    challenge_otp: ['/challenge-get-otp', '/challenge-verify-otp'],
    challenge_facematch: ['/challenge-facematch'],
    installment: ['/get-installment-eligible', '/get-installment-offering-list',
                  '/installment-request', '/installment-confirm',
                  '/get-installment-detail', '/get-installment-transactions'],
    cb_update_status: ['/partner-update-status'],
    cb_repayment_status: ['/partner-repayment-status'],
    cb_payment_status: ['/partner-payment-status'],
  },
  collection: {
    collections: ['/collection-notifications'],
  },
};

/** `### <heading>` trong info.description -> feature nào bật thì giữ. General luôn giữ. */
export const ERROR_SECTIONS = {
  native: {
    'Onboarding / Pre-check': ['onboarding'],
    Contract: ['contract'],
    Challenge: ['challenge_otp', 'challenge_facematch'],
    Repayment: ['repayment_request_confirm', 'repayment_van', 'repayment_status'],
    Termination: ['termination'],
    Installment: ['installment', 'payment'],
  },
  dop: {
    Challenge: ['challenge_otp', 'challenge_facematch'],
    Repayments: ['repayment_request_confirm', 'repayment_van', 'repayment_status'],
    Terminates: ['termination'],
  },
  collection: {},
};

/** key trong x-mermaid-flows -> feature nào bật thì giữ. */
export const FLOWS = {
  native: {
    onboarding: ['onboarding'],
    challenge_sub_flow: ['challenge_otp', 'challenge_facematch'],
    contract_signing: ['contract'],
    disburse: ['disburse_request', 'disburse_update'],
    repayment: ['repayment_van', 'repayment_request_confirm'],
    termination: ['termination'],
    payment: ['payment'],
    installment_conversion: ['installment'],
  },
  dop: {
    onboarding: ['onboarding_webview'],
    loan_info: ['loan_detail_api'],
    repayment: ['repayment_van'],
    repayment_request_confirm: ['repayment_request_confirm'],
    challenge_sub_flow: ['challenge_otp', 'challenge_facematch'],
  },
  collection: { collection_reminder: ['collections'] },
};

/**
 * Manifest -> tập feature bật. Đây là chỗ duy nhất suy diễn "chọn A thì kéo theo B",
 * để UI và CLI không lệch nhau.
 */
export function featuresOf(m) {
  const f = new Set();
  const on = (k) => f.add(k);
  const model = m.model;

  if (model === 'collection') {
    on('collections');
    return f;
  }

  if (model === 'dop') {
    if (m.onboarding?.enabled !== false) on('onboarding_webview');
  } else {
    if (m.onboarding?.enabled !== false) {
      on('onboarding');
      if (m.onboarding?.data_config !== false) on('data_config');
      if (m.onboarding?.get_status) on('get_status');
    }
    if (m.contract?.enabled !== false) {
      on('contract');
      if (m.contract?.cancel !== false) on('contract_cancel');
    }
  }

  if (m.onboarding?.challenge_otp) on('challenge_otp');
  if (m.onboarding?.challenge_facematch) on('challenge_facematch');

  if (m.loan_detail?.api !== false) on('loan_detail_api');
  if (m.loan_detail?.webview && model === 'dop') on('loan_detail_webview');

  // Giải ngân: chỉ mode `partner_callback` mới có 2 endpoint callback + disburse-update.
  // `external_bank` = Cake giải ngân thẳng vào TK ngân hàng ngoài của KH (bank-*),
  // partner không giải ngân nên không có endpoint nào.
  if (m.disburse?.mode === 'partner_callback') {
    on('disburse_request');
    on('disburse_update');
    if (m.disburse?.status_query) on('disburse_status');
  }

  const rm = m.repayment?.mode || 'none';
  if (rm === 'van' || rm === 'both') on('repayment_van');
  if (rm === 'request_confirm' || rm === 'both') on('repayment_request_confirm');
  if (rm !== 'none' && m.repayment?.status !== false) on('repayment_status');
  if (rm !== 'none' && m.repayment?.partner_callback) on('cb_repayment_status');

  if (m.termination && model === 'native') on('termination');
  if (m.payment) { on('payment'); if (m.payment_callback !== false) on('cb_payment_status'); }
  if (m.installment) on('installment');

  if (m.callbacks?.update_status !== false) on('cb_update_status');

  return f;
}

/** Endpoint được giữ, theo thứ tự xuất hiện trong base. */
export function pathsOf(m) {
  const table = FEATURE_PATHS[m.model] || {};
  const feats = featuresOf(m);
  const keep = new Set();
  for (const [feat, paths] of Object.entries(table)) {
    if (feats.has(feat)) paths.forEach((p) => keep.add(p));
  }
  return keep;
}
