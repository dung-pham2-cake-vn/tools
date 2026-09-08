#!/usr/bin/env python3
"""One-off migration: specs/base/* -> specs/base2/*  (merged supersets).

Giữ lại để audit: đọc file này để biết base2 được gộp từ đâu và theo quyết định nào.
Sau khi chạy, base2/*.yaml là source of truth mới, sửa tay trực tiếp.
Chạy: python3 builder/_mk_base2.py
"""
import os, re, sys, textwrap

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'specs', 'base')
OUT = os.path.join(ROOT, 'specs', 'base2')


def load(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read().split('\n')


def find(lines, key, start=0):
    """index của dòng đúng bằng `key` (không tính khoảng trắng cuối)."""
    for i in range(start, len(lines)):
        if lines[i].rstrip() == key.rstrip():
            return i
    raise KeyError(key)


def block(lines, key, start=0):
    """Trả (i, j): block bắt đầu ở dòng `key`, kết thúc trước dòng cùng/ít indent hơn.
    Bao gồm cả comment banner ngay trên và dòng trắng ngay dưới."""
    i = find(lines, key, start)
    indent = len(lines[i]) - len(lines[i].lstrip())
    # lùi lên gom comment banner liền kề
    b = i
    while b > 0:
        prev = lines[b - 1]
        if prev.strip().startswith('#') and (len(prev) - len(prev.lstrip())) == indent:
            b -= 1
        else:
            break
    j = i + 1
    while j < len(lines):
        l = lines[j]
        if l.strip() and (len(l) - len(l.lstrip())) <= indent:
            break
        j += 1
    # gom dòng trắng cuối
    while j > i + 1 and not lines[j - 1].strip():
        j -= 1
    return b, j


def cut(lines, key, start=0):
    b, j = block(lines, key, start)
    return lines[b:j]


def cut_nb(lines, key, start=0):
    """Như cut() nhưng bỏ comment banner phía trên — dùng khi chèn vào
    section đã có banner, tránh in banner 2 lần."""
    seg = cut(lines, key, start)
    while seg and seg[0].strip().startswith('#'):
        seg.pop(0)
    return seg


def replace_desc(lines, key, new_desc, start=0):
    """Đổi `description:` (kể cả dạng nhiều dòng) của property `key`."""
    b, j = block(lines, key, start)
    seg = lines[b:j]
    indent = len(seg[0]) - len(seg[0].lstrip()) + 2
    out, k = [], 0
    while k < len(seg):
        l = seg[k]
        if l.strip().startswith('description:') and (len(l) - len(l.lstrip())) == indent:
            out.append(' ' * indent + 'description: ' + new_desc)
            k += 1
            while k < len(seg) and (len(seg[k]) - len(seg[k].lstrip())) > indent:
                k += 1
            continue
        out.append(l)
        k += 1
    return lines[:b] + out + lines[j:]


def add_after_prop(lines, key, extra, start=0):
    """Chèn `extra` (list dòng, đã canh indent) vào cuối block của property `key`."""
    b, j = block(lines, key, start)
    return lines[:j] + extra + lines[j:]


def insert_before(lines, key, extra, start=0):
    b, _ = block(lines, key, start)
    return lines[:b] + extra + lines[b:]


def insert_after(lines, key, extra, start=0):
    _, j = block(lines, key, start)
    return lines[:j] + [''] + extra + lines[j:]


# ══════════════════════════════════════════════════════════════════
# Product profile của get-loan-detail (nguồn: get-loan-detail-api.md
# + đối chiếu 3 file base_native_* và 2 file base_dop_*)
# ══════════════════════════════════════════════════════════════════
ALL3 = ['cashloan', 'payday', 'paylater']
LOAN_DETAIL_PRODUCT = {
    'loan_account_status': ALL3, 'contract_id': ALL3, 'loan_alias': ALL3,
    'contract_url': ALL3, 'full_name': ALL3, 'document_id': ALL3,
    'approved_amount': ALL3, 'approved_term': ALL3, 'disburse_amount': ALL3,
    'interest_rate': ALL3, 'principle_balance': ALL3, 'interest_balance': ALL3,
    'due_date': ALL3, 'day_arrears': ALL3, 'total_payment_amount': ALL3,
    # chỉ vay giải ngân lump-sum
    'loan_insurance': ['cashloan', 'payday'],
    'disburse_date': ['cashloan', 'payday'],
    'penalty_principal_balance': ['cashloan', 'payday'],
    'penalty_interest_balance': ['cashloan', 'payday'],
    'paid_amount': ['cashloan', 'payday'],
    # chỉ sản phẩm trả theo kỳ
    'payment_period': ['cashloan', 'paylater'],
    'prepayment_amount': ['cashloan', 'paylater'],
    'predue_payment_amount': ['cashloan'],
    'due_payment_amount': ['cashloan'],
    'period_payment_amount': ['paylater'],
}
TAG = {tuple(ALL3): '', ('cashloan', 'payday'): '[CL/PD] ',
       ('cashloan', 'paylater'): '[CL/PL] ', ('cashloan',): '[CL] ',
       ('paylater',): '[PL] '}


def annotate_loan_detail(lines):
    """Thêm `x-product` vào từng field của GetLoanDetailResponse.data
    + `x-product-enum` cho LOAN_LOCK/LOAN_LOCKED (chỉ Paylater)."""
    b, j = block(lines, '    GetLoanDetailResponse:')
    seg = lines[b:j]
    out, k, prop_indent = [], 0, 16  # properties của data ở indent 16
    while k < len(seg):
        l = seg[k]
        m = re.match(r'^( {16})([a-z_]+):\s*$', l)
        if not m:
            out.append(l); k += 1; continue
        name = m.group(2)
        # gom cả block property
        pb = [l]; k += 1
        while k < len(seg) and (not seg[k].strip() or len(seg[k]) - len(seg[k].lstrip()) > prop_indent):
            pb.append(seg[k]); k += 1
        prods = LOAN_DETAIL_PRODUCT.get(name)
        if prods:
            ind = ' ' * (prop_indent + 2)
            # bỏ dòng trắng cuối ra khỏi block để chèn đúng chỗ
            tail = []
            while pb and not pb[-1].strip():
                tail.insert(0, pb.pop())
            if prods != ALL3:
                pb.append(ind + 'x-product: [ ' + ', '.join(prods) + ' ]')
            if name == 'loan_account_status':
                pb += [ind + 'x-product-enum:',
                       ind + '  LOAN_LOCK: [ paylater ]',
                       ind + '  LOAN_LOCKED: [ paylater ]']
            pb += tail
        out += pb
    return lines[:b] + out + lines[j:]


SUPERSET_NOTE = """    > **Đây là base SUPERSET.** File này chứa *toàn bộ* endpoint và field của mô hình
    > {model}. Spec gửi đối tác được **sinh ra** từ file này bằng `builder/` — không copy tay.
    > Field trong `get-loan-detail` mang khoá `x-product` cho biết sản phẩm nào có field đó
    > (`cashloan` / `payday` / `paylater`); prefix `[CL]`, `[CL/PD]`, `[CL/PL]`, `[PL]` trong
    > `description` là bản cho người đọc của cùng thông tin đó.
"""

# ══════════════════════════════════════════════════════════════════
# 1. base2/base_native.yaml  =  base_native (đã là superset native)
#    + partner-disburse-status (chỉ có ở 3 file base_native_*)
#    + x-product markers + canonical wording
# ══════════════════════════════════════════════════════════════════
def build_native():
    L = load('base_native.yaml')
    V = load('base_native_cashloan.yaml')

    # --- note superset vào ## Mô tả
    i = find(L, '    ## Mô tả')
    L = L[:i + 2] + [''] + SUPERSET_NOTE.format(model='**Native**').rstrip('\n').split('\n') + L[i + 2:]

    # --- x-product markers
    L = annotate_loan_detail(L)

    # --- disburse_date thiếu prefix [CL/PD]
    L = replace_desc(L, '                disburse_date:', '"[CL/PD] Ngày giải ngân (yyyy-mm-dd)"')

    # --- wording canonical: mô tả phải đúng cho mọi cấu hình sinh ra từ superset
    L = replace_desc(L, '                request_id:',
                     'ID dùng cho các API client-update, loan-register (và get-status nếu sản phẩm bật)',
                     start=find(L, '    ClientCreateResponse:'))
    L = replace_desc(L, '        order_id:',
                     'order_id trả về từ API /repayment-request hoặc /repayment-van',
                     start=find(L, '    RepaymentStatusRequest:'))
    L = replace_desc(L, '                challenge_level:',
                     '"Mức xác thực bổ sung cần thực hiện. 1=None, 2=Facematch, 3=SMS OTP, '
                     '4=DTN Cake OTP. Giá trị cụ thể do cấu hình sản phẩm quyết định."',
                     start=find(L, '    CheckProfileResponse:'))

    # --- mask example còn sót (CLAUDE.md §1): SĐT người tham chiếu
    for k in ['contact_number_1', 'contact_number_2']:
        i = find(L, f'        {k}:')
        for n in range(i, i + 5):
            if L[n].strip().startswith('example:'):
                L[n] = '          example: "0xxxxxxxxx"'
                break

    # --- PartnerDisburseRequest: bổ sung loan_insurance + disburse_amount (có ở base_native_*)
    extra = [
        '        loan_insurance:',
        '          type: string',
        '          description: "[CL/PD] Số tiền bảo hiểm khoản vay"',
        '          x-product: [ cashloan, payday ]',
        '          example: "840000"',
        '        disburse_amount:',
        '          type: string',
        '          description: Số tiền giải ngân thực tế (đã gồm bảo hiểm nếu có)',
        '          example: "12840000"',
    ]
    L = add_after_prop(L, '        approved_amount:', extra,
                       start=find(L, '    PartnerDisburseRequest:'))

    # --- schemas PartnerDisburseStatus* lấy nguyên từ base_native_cashloan
    s1 = cut(V, '    PartnerDisburseStatusRequest:')
    s2 = cut(V, '    PartnerDisburseStatusResponse:')
    L = insert_after(L, '    PartnerDisburseRequest:', s1 + [''] + s2)

    # --- path /partner-disburse-status lấy nguyên từ base_native_cashloan
    p = cut(V, '  /partner-disburse-status:')
    L = insert_after(L, '  /partner-disburse-request:', p)

    return '\n'.join(L)


# ══════════════════════════════════════════════════════════════════
# 2. base2/base_dop.yaml = base_dop_paylater (info/error superset)
#    + paths & schemas chỉ có ở base_dop_full
#    + GetLoanDetailResponse superset (lấy từ base_native đã annotate)
# ══════════════════════════════════════════════════════════════════
def build_dop(native_text):
    P = load('base_dop_paylater.yaml')
    F = load('base_dop_full.yaml')
    N = native_text.split('\n')

    # DOP base gốc không có `## Mô tả` / `## Changelog` (native có) -> thêm cho đồng bộ,
    # builder cần bảng Changelog để chèn dòng mỗi lần gửi đối tác.
    i = find(P, '    ## Cơ chế xác thực (Signature)')
    head = ['    ## Mô tả',
            '    API tích hợp giữa đối tác (Partner) và hệ thống Cake Digital Bank theo mô hình **DOP**',
            '    (Digital Onboarding Process).',
            '']
    head += SUPERSET_NOTE.format(model='**DOP (webview)**').rstrip('\n').split('\n')
    head += ['',
             '    ## Changelog',
             '',
             '    | Thời gian | Email title | Cập nhật |',
             '    |-----------|-------|-------|',
             '    | 2026-0x-0x | email_title | Khởi tạo tài liệu |',
             '']
    # bỏ đoạn prose cũ (2 dòng mô tả DOP + dòng trắng) nằm ngay trên `## Cơ chế`
    k = i
    while k > 0 and not P[k - 1].strip().startswith('> '):
        k -= 1
    P = P[:k] + [''] + head + P[i:]

    # --- GetLoanDetailResponse: thay bằng bản superset đã annotate của native
    b, j = block(P, '    GetLoanDetailResponse:')
    P = P[:b] + cut(N, '    GetLoanDetailResponse:') + P[j:]

    # --- GetLoanDetailRequest / RepaymentStatusRequest: canonical wording
    P = replace_desc(P, '        order_id:',
                     'order_id trả về từ API /repayment-request hoặc /repayment-van',
                     start=find(P, '    RepaymentStatusRequest:'))

    # --- schemas chỉ có ở dop_full
    add = []
    for name in ['GenerateWebviewLoanDetailRequest', 'DisburseUpdateRequest',
                 'RepaymentConfirmRequest', 'RepaymentRequestResponse', 'PartnerDisburseRequest']:
        add += cut(F, f'    {name}:') + ['']
    P = insert_after(P, '    GenerateWebviewResponse:', add[:-1])

    # --- paths chỉ có ở dop_full
    P = insert_after(P, '  /generate-webview/onboarding:', cut(F, '  /generate-webview/loan-detail:'))
    P = insert_after(P, '  /get-loan-detail:', cut_nb(F, '  /disburse-update:'))
    P = insert_after(P, '  /repayment-van:',
                     cut_nb(F, '  /repayment-request:') + [''] + cut_nb(F, '  /repayment-confirm:'))
    P = insert_after(P, '  /partner-update-status:', cut(F, '  /partner-disburse-request:'))

    # --- tag Repayment: superset có cả 2 luồng (VAN QR và request→confirm)
    P = replace_desc(P, '  - name: Repayment',
                     'Thanh toán kỳ hạn khoản vay — VAN QR (repayment-van → repayment-status) '
                     'hoặc request→confirm (repayment-request → repayment-confirm → repayment-status)')

    # --- tag Loan Info: gộp mô tả
    P = replace_desc(P, '  - name: Loan Info',
                     '|\n      Thông tin & giải ngân khoản vay:\n'
                     '      get-loan-detail, disburse-update, generate-webview/loan-detail')

    # --- flows: onboarding lấy bản dop_full (có partner-disburse-request + disburse-update),
    #     repayment giữ bản VAN của paylater và thêm bản request→confirm của dop_full
    b, j = block(P, '  onboarding: |')
    P = P[:b] + cut(F, '  onboarding: |') + P[j:]
    P = insert_after(P, '  repayment: |',
                     ['  repayment_request_confirm: |'] + cut(F, '  repayment: |')[1:])
    return '\n'.join(P)


def main():
    os.makedirs(OUT, exist_ok=True)
    nat = build_native()
    with open(os.path.join(OUT, 'base_native.yaml'), 'w', encoding='utf-8') as f:
        f.write(nat)
    with open(os.path.join(OUT, 'base_dop.yaml'), 'w', encoding='utf-8') as f:
        f.write(build_dop(nat))
    # collection reminder: chỉ 1 endpoint, không có gì để gộp -> copy nguyên
    with open(os.path.join(SRC, 'base_collection_reminder.yaml'), encoding='utf-8') as f:
        cr = f.read()
    with open(os.path.join(OUT, 'base_collection.yaml'), 'w', encoding='utf-8') as f:
        f.write(cr)
    print('base2 written ->', OUT)
    build_custom()




# ══════════════════════════════════════════════════════════════════
# 3. base2/custom/*.yaml — fragment cho hợp đồng KHÔNG theo base.
#    Engine merge fragment lên trên spec đã build từ base:
#      paths            -> ghi đè theo key
#      components.*     -> merge theo key
#      x-error-tables   -> append vào info.description sau `## Error Codes`
#    be_cashloan/ và dvs/ KHÔNG có fragment: 2 spec đó không dựng từ base
#    (manifest `model: custom`), giữ nguyên là partner spec độc lập.
# ══════════════════════════════════════════════════════════════════
SPECS = os.path.join(ROOT, 'specs')


def load_partner(rel):
    with open(os.path.join(SPECS, rel), encoding='utf-8') as f:
        return f.read().split('\n')


def md_section(lines, heading):
    """Cắt 1 block `### ...` trong info.description (markdown)."""
    i = find(lines, heading)
    j = i + 1
    while j < len(lines):
        s = lines[j].strip()
        if s.startswith('## ') or s.startswith('### '):
            break
        j += 1
    while j > i + 1 and not lines[j - 1].strip():
        j -= 1
    return [l[4:] if l.startswith('    ') else l for l in lines[i:j]]


def reindent(lines, delta):
    return [(' ' * delta + l) if l.strip() else '' for l in lines]


def frag(header, params=None, schemas=None, paths=None, err=None):
    out = header.rstrip('\n').split('\n') + ['']
    if err:
        out += ['x-error-tables:', '  ' + err[0] + ': |'] + reindent(err[1], 4) + ['']
    if params or schemas:
        out += ['components:']
        if params:
            out += ['  parameters:'] + params + ['']
        if schemas:
            out += ['  schemas:'] + schemas + ['']
    if paths:
        out += ['paths:'] + paths + ['']
    return '\n'.join(out).rstrip('\n') + '\n'


def build_custom():
    cdir = os.path.join(OUT, 'custom')
    os.makedirs(cdir, exist_ok=True)
    Z = load_partner('zlp_cashloan/index.yaml')
    V = load_partner('pd_viettel/index.yaml')

    # ── ZaloPay bankconnector: 2 endpoint giải ngân theo chuẩn ZLP
    hdr = """# ─────────────────────────────────────────────────────────────
# FRAGMENT — ZaloPay bankconnector (giải ngân/top-up ví ZLP)
#
# Dùng cho: zlp_cashloan, zlp_payday
# Ghi đè:   /partner-disburse-request, /partner-disburse-status
#
# ZLP đã cố định hợp đồng theo chuẩn bankconnector của họ
# (`Zalopay-IB_Mobile_Banking_Integration` v1.5): field `fnc`, `partnerId`,
# `bankTransId`, `data` dạng string-json; ký bằng field `signature` trong body,
# header chỉ `Content-Type`. KHÔNG đồng bộ 2 endpoint này về base.
# ─────────────────────────────────────────────────────────────
x-fragment:
  name: zlp_bankconnector
  applies-to: [ zlp_cashloan, zlp_payday ]
  overrides-paths:
    - /partner-disburse-request
    - /partner-disburse-status
"""
    sch = []
    for n in ['PartnerDisburseRequest', 'PartnerDisburseResponse',
              'PartnerDisburseStatusRequest', 'PartnerDisburseStatusResponse']:
        sch += cut(Z, f'    {n}:') + ['']
    paths = cut(Z, '  /partner-disburse-request:') + [''] + cut(Z, '  /partner-disburse-status:')
    err = ('bankconnector',
           md_section(Z, '    ### Error code table — bankconnector ZLP (`resultCode` / `returnCode`)'))
    with open(os.path.join(cdir, 'zlp_bankconnector.yaml'), 'w', encoding='utf-8') as f:
        f.write(frag(hdr, schemas=sch[:-1], paths=paths, err=err))

    # ── ZaloPay partner-update-status: header x-client-key/x-sign, response return_code
    hdr = """# ─────────────────────────────────────────────────────────────
# FRAGMENT — ZaloPay /partner-update-status
#
# Dùng cho: zlp_cashloan, zlp_payday
# Ghi đè:   /partner-update-status
#
# Khác quy ước `partner-*` chuẩn của Cake: header `x-client-key` + `x-sign`
# (không dùng `signature`), response `return_message`/`return_code`/`sub_return_code`
# thay cho `success`/`code`/`message`. Path phía ZLP:
# `POST /cash-loan/cake/contract/callback`.
# ─────────────────────────────────────────────────────────────
x-fragment:
  name: zlp_partner_update_status
  applies-to: [ zlp_cashloan, zlp_payday ]
  overrides-paths:
    - /partner-update-status
"""
    prm = cut(Z, '    ClientKeyHeader:') + [''] + cut(Z, '    XSignHeader:')
    sch = cut(Z, '    PartnerUpdateStatusRequest:') + [''] + cut(Z, '    PartnerUpdateStatusResponse:')
    with open(os.path.join(cdir, 'zlp_partner_update_status.yaml'), 'w', encoding='utf-8') as f:
        f.write(frag(hdr, params=prm, schemas=sch, paths=cut(Z, '  /partner-update-status:')))

    # ── Viettel: endpoint bắc cầu loan_id (DOP cũ) -> loan_code (Native)
    hdr = """# ─────────────────────────────────────────────────────────────
# FRAGMENT — Viettel legacy loan_id → loan_code
#
# Dùng cho: pd_viettel
# Thêm:     /get-loan-code-from-loan-id  (tag `Legacy Support`)
#
# Sản phẩm Viettel chuyển từ DOP (định danh `loan_id`) sang Native
# (định danh `loan_code`). Endpoint này chỉ để hỗ trợ khoản vay cũ.
# ─────────────────────────────────────────────────────────────
x-fragment:
  name: viettel_legacy_loan_id
  applies-to: [ pd_viettel ]
  adds-paths:
    - /get-loan-code-from-loan-id
  adds-tags:
    - name: Legacy Support
      description: Endpoint bắc cầu cho khoản vay tạo từ mô hình DOP cũ.
"""
    sch = cut(V, '    GetLoanCodeFromLoanIdRequest:') + [''] + cut(V, '    GetLoanCodeFromLoanIdResponse:')
    with open(os.path.join(cdir, 'viettel_legacy_loan_id.yaml'), 'w', encoding='utf-8') as f:
        f.write(frag(hdr, schemas=sch, paths=cut(V, '  /get-loan-code-from-loan-id:')))

    print('custom fragments written ->', cdir)


if __name__ == '__main__':
    main()
