# -*- coding: utf-8 -*-
"""Điền số liệu đã xác minh từ Jira vào file KB khung.
Mỗi mục ghi kèm ticket + ngày live để truy ngược."""
import re, os, sys

F = {
 'kb/products/cashloan/partners/vds/viettel_cashloan.md': dict(
  tickets=['PL-11720'], asof='2026-02-10', partial=True,
  body="""### Nhóm SIM ngoại mạng

Khách dùng SIM không phải Viettel đi theo product code riêng.

| | Khách mới (`NONVTCL_01`) | Khách vay lại (`NONVTCL_02`) |
|---|---|---|
| Hạn mức | 5 – 25 triệu (bước 1 triệu) | 5 – 30 triệu (bước 1 triệu) |
| Kỳ hạn | 6 – 24 tháng (bước 3 tháng) | 6 – 24 tháng (bước 3 tháng) |
| Lãi không bảo hiểm | 59%/năm | 54%/năm |
| Lãi có bảo hiểm | 48%/năm | 43%/năm |
| Phí bảo hiểm | 7% | 7% |
| Tuổi | 20 – 50 | 20 – 50 |
| Thu nhập tối thiểu | 5 triệu/tháng | 5 triệu/tháng |
| Phạt gốc chậm | 150% | 150% |
| Phí tất toán sớm | 8% trước kỳ 3, 5% từ kỳ 3 | như bên |
| Điều kiện tất toán | Không yêu cầu | Không yêu cầu |

Nguồn: [PL-11720](https://cakedigitalbank.atlassian.net/browse/PL-11720), live 2026-02-10.

> **Chưa có số cho nhóm SIM Viettel (sản phẩm chính).** Không tìm thấy ticket policy
> riêng trong phạm vi export. **Agent không suy số của nhóm ngoại mạng sang nhóm chính.**"""),

 'kb/products/payday/partners/vds/pd_viettel.md': dict(
  tickets=['PL-12076','PL-12708'], asof='2026-04-22',
  body="""| | Khách SIM Viettel | Khách SIM ngoại mạng |
|---|---|---|
| Số tiền vay | 3 – 5 triệu | 3 – 7 triệu |
| Kỳ hạn | 30 ngày | 30 – 45 ngày |
| Lãi suất | 60%/năm | 60%/năm |
| Phí bảo hiểm | 8% | 8% |

Thu nhập tối thiểu **5 triệu/tháng** (tăng từ 3 triệu, [PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708), hiệu lực 2026-03-16).

Nguồn: [PL-12076](https://cakedigitalbank.atlassian.net/browse/PL-12076), live 2026-04-22."""),

 'kb/products/payday/partners/cake/cake_payday.md': dict(
  tickets=['PL-12681','PL-12521'], asof='2026-05-14',
  body="""| Chỉ tiêu | Giá trị |
|---|---|
| Số tiền vay — lần 1 | 2 – 3 triệu |
| Số tiền vay — lần 2 trở đi | 3 – 6 triệu |
| Lãi suất | **59%/năm** |

Nguồn: lãi suất [PL-12681](https://cakedigitalbank.atlassian.net/browse/PL-12681) (55% → 59%, live 2026-05-14);
hạn mức [PL-12521](https://cakedigitalbank.atlassian.net/browse/PL-12521) (lần 2+ lên 6 triệu, live 2026-05-08).

> **Chưa có số** cho phí bảo hiểm, phạt trả chậm, phí tất toán — không thấy ticket riêng."""),

 'kb/products/od/partners/cake/cake_overdraft.md': dict(
  tickets=['PL-12807','PL-12708'], asof='2026-09-03',
  body="""Thấu chi có tài sản bảo đảm là sổ tiết kiệm. **Overdraft v2**, live 2026-09-03.

| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | **90%** giá trị sổ (loại TD0002) · **75%** (loại TD0003) |
| Lãi suất | Động: cao nhất của (lãi suất sổ + 2,5%), **tối thiểu 7,2%/năm** |
| Kỳ hạn | 1 – 12 tháng, mặc định 12 tháng |
| Thu nhập tối thiểu | 5 triệu/tháng (tăng từ 3 triệu, hiệu lực 2026-03-16) |

Trước v2: hạn mức cố định 85%, lãi cố định 7,5%, kỳ hạn mặc định 12 tháng.

**Lãi suất thay đổi theo sổ tiết kiệm của từng khách** — luôn tra hệ thống, không báo con số chung.

Nguồn: [PL-12807](https://cakedigitalbank.atlassian.net/browse/PL-12807), [PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708)."""),

 'kb/products/cashloan/partners/cake-affiliate/cake_cl_affiliate.md': dict(
  tickets=['PL-12047','PL-12163'], asof='2026-05-08',
  body="""| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | 10 – 50 triệu |
| Lãi suất không bảo hiểm | 59%/năm |
| Lãi suất có bảo hiểm | 48%/năm |
| Phí bảo hiểm | 7% |
| Phạt gốc chậm | 150% × lãi suất × dư nợ gốc × số ngày chậm |
| Phạt lãi chậm | 10% × lãi chậm × số ngày chậm |
| Tuổi / thu nhập | 20–50 tuổi, thu nhập ≥ 5 triệu/tháng |

### Phí tất toán trước hạn

| Thời điểm | Phí | Công thức |
|---|---|---|
| Trong 3 tháng đầu | **8%** | `8% × (dư nợ gốc − gốc đến hạn)` |
| Từ tháng thứ 4 | **5%** | `5% × (dư nợ gốc − gốc đến hạn)` |

> Cơ sở tính phí là **dư nợ gốc chưa đến hạn**, không phải toàn bộ dư nợ gốc.
> Đừng nhân phí với tổng dư nợ khi ước tính cho khách — **tra hệ thống**.

Nguồn: [PL-12047](https://cakedigitalbank.atlassian.net/browse/PL-12047),
[PL-12163](https://cakedigitalbank.atlassian.net/browse/PL-12163)."""),

 'kb/products/cashloan/partners/vnpay/vnp_cashloan.md': dict(
  tickets=['PL-14264'], asof='2026-09-15',
  body="""| Lãi suất | Giá trị |
|---|---|
| Có bảo hiểm | **50%/năm** |
| Không bảo hiểm | **55%/năm** |

Tăng từ 45% / 50%. Nguồn: [PL-14264](https://cakedigitalbank.atlassian.net/browse/PL-14264), live **2026-09-15** — đây là thay đổi chính sách mới nhất toàn danh mục.

> **Chưa có số** cho hạn mức, kỳ hạn, phí bảo hiểm."""),

 'kb/products/payday/partners/vnpay/vnp_payday.md': dict(
  tickets=['PL-11271','PL-12708'], asof='2025-12-10',
  body="""| Chỉ tiêu | Giá trị |
|---|---|
| Số tiền vay — lần đầu | 4 triệu |
| Số tiền vay — lần 2 trở đi | 4 – 6 triệu |
| Thu nhập tối thiểu | 5 triệu/tháng (tăng từ 4 triệu, hiệu lực 2026-03-16) |

Nguồn: [PL-11271](https://cakedigitalbank.atlassian.net/browse/PL-11271),
[PL-12708](https://cakedigitalbank.atlassian.net/browse/PL-12708)."""),

 'kb/products/payday/partners/be/be_payday.md': dict(
  tickets=['PL-12940','PL-13050'], asof='2026-07-24',
  body="""| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | 2 triệu – **4 triệu** (lần 1) · 2 – **6 triệu** (lần 2 trở đi) |
| Kỳ hạn | **30 ngày** (lần 1) · **30–45 ngày** (lần 2 trở đi) |
| Lãi suất | **60%/năm**, cố định — tính trên dư nợ gốc thực tế, cơ sở 365 ngày |
| Phí bảo hiểm | **8%** × số tiền phê duyệt — **bắt buộc** |
| Giảm lãi khi mua bảo hiểm | **Không** — lãi cố định, bảo hiểm là phí riêng |
| Phạt gốc chậm | 150% × 60%/năm × dư nợ gốc quá hạn × số ngày chậm ÷ 365 |
| Phạt lãi chậm | **Không áp dụng** |
| Phí tất toán trước hạn | **0%** — không mất phí, không điều kiện |
| Điều kiện khách | Người dùng app BE · thu nhập ≥ 5 triệu/tháng · **tuổi 18–50** · CCCD 12 số còn hiệu lực |

> Hai điểm khác hẳn các sản phẩm khác: **bảo hiểm bắt buộc** (không được bỏ tick) và
> **tất toán sớm miễn phí**. Tuổi tối thiểu 18, không phải 20.

Nguồn: [PL-12940](https://cakedigitalbank.atlassian.net/browse/PL-12940),
[PL-13050](https://cakedigitalbank.atlassian.net/browse/PL-13050)."""),

 'kb/products/cashloan/partners/klp/klp_cashloan.md': dict(
  tickets=['PL-10318'], asof='2026-08-22',
  body="""| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức | 5 – 30 triệu |
| Lãi suất không bảo hiểm | 59%/năm |
| Lãi suất có bảo hiểm | 48%/năm |
| Phí bảo hiểm | 7% × số tiền vay |
| Phạt gốc chậm | 150% × lãi suất trong hạn × dư nợ gốc × số ngày chậm |
| Phạt lãi chậm | **Không áp dụng** |
| Phí tất toán trước hạn | **8%** (trước kỳ 3) · **5%** (từ kỳ 3 trở đi) |

Nguồn: [PL-10318](https://cakedigitalbank.atlassian.net/browse/PL-10318), live 2026-08-22."""),

 'kb/products/cashloan/partners/vnpost/vpo_cl_pension.md': dict(
  tickets=['PL-12435'], asof='2026-05-14',
  body="""**Sản phẩm cho người hưu trí — điều kiện khác hẳn phần còn lại của danh mục:
hạn mức tới 300 triệu và lãi suất chỉ 13,5–16,5%/năm.**

| Chỉ tiêu | Kỳ hạn 0–24 tháng | Kỳ hạn 25–60 tháng |
|---|---|---|
| Số tiền vay | 10 – 300 triệu (bước 1 triệu) | như bên |
| Lãi suất có bảo hiểm | **13,5%/năm** | **15%/năm** |
| Lãi suất không bảo hiểm | **16,5%/năm** | **16%/năm** |
| Phí bảo hiểm | **1,5%** × số tiền vay | **2,5%** × số tiền vay |
| Phí tất toán trước hạn | **2%** | **0%** |
| Phạt gốc chậm | 150% × lãi suất trong hạn × dư nợ gốc chậm × số ngày chậm | như bên |

Thu nhập tối thiểu 5 triệu/tháng (tăng từ 4 triệu, hiệu lực 2026-03-16).

> **Bảo hiểm khoản vay là bắt buộc.** Khách chưa chọn thì bị chặn ngay sau khi nộp hồ sơ,
> trước khi vào thẩm định — hiện màn "chưa đủ điều kiện".
>
> Kỳ hạn dài (25–60 tháng) **tất toán sớm miễn phí**; kỳ hạn ngắn mất 2%.
> Đây là điểm ngược trực giác, khách dễ hiểu nhầm.

Nguồn: [PL-12435](https://cakedigitalbank.atlassian.net/browse/PL-12435), live 2026-05-14.
Trước đó: bảo hiểm 3%, lãi 13,5%/16,5%, phí tất toán 3%."""),

 'kb/products/cashloan/partners/zalopay/zlp_cashloan.md': dict(
  tickets=['PL-12533'], asof='2026-05-08',
  body="""| Chỉ tiêu | Giá trị |
|---|---|
| Số tiền vay | **3 – 70 triệu** (bước 1 triệu) |
| Kỳ hạn | **3 – 60 tháng** (bước 1 tháng) |
| Lãi suất có bảo hiểm | 50%/năm |
| Lãi suất không bảo hiểm | 55%/năm |

Tăng từ 2–50 triệu / 3–48 tháng. Nguồn: [PL-12533](https://cakedigitalbank.atlassian.net/browse/PL-12533), live 2026-05-08.

> **Chưa có số** cho phí bảo hiểm, phạt trả chậm, phí tất toán."""),

 'kb/products/paylater/partners/mwg/mwg_paylater.md': dict(
  tickets=['PL-14106'], asof='2026-08-25',
  body="""| Chỉ tiêu | Giá trị |
|---|---|
| Hạn mức đề nghị tối đa | **60 triệu** (nhóm có partner score) |

Tăng từ 40 triệu. Nguồn: [PL-14106](https://cakedigitalbank.atlassian.net/browse/PL-14106), live 2026-08-25.

Paylater **không có** phạt gốc/lãi quá hạn trả về qua API như Cashloan/Payday —
cơ chế phí khác, xem ticket sản phẩm.

> **Chưa có số** cho lãi suất, phí chuyển đổi trả góp, phí trả chậm."""),
}

changed = 0
for path, d in F.items():
    if not os.path.exists(path):
        print('THIẾU FILE:', path); continue
    s = open(path, encoding='utf-8').read()
    if 'đã xác minh Jira' in s:
        continue
    src = ''.join(f'  - jira:{t}\n' for t in d['tickets'])
    s = s.replace('sources:\n', 'sources:\n' + src, 1)
    s = s.replace('numbers_source: none', 'numbers_source: jira')
    s = s.replace('needs_jira_verify: true', 'needs_jira_verify: false')
    s = s.replace('status: skeleton',
                  'status: draft' + ('\ncoverage: partial' if d.get('partial') else ''))
    s = s.replace('last_verified: 2026-09-30',
                  f"last_verified: 2026-09-30\nnumbers_asof: {d['asof']}")
    old = s[s.index('## Hạn mức, kỳ hạn, lãi suất, phí'):s.index('## Cần viết')]
    s = s.replace(old, '## Số liệu — đã xác minh Jira\n\n' + d['body'] + '\n\n')
    s = s.replace("""> **File khung.** Phần nhận diện và cấu hình kênh đã đúng (lấy từ bảng Partnership products).
> **Phần số liệu — hạn mức, kỳ hạn, lãi suất, phí — chưa điền**, chờ lượt quét Jira.
>
> Agent **không trả lời khách bất kỳ con số nào** cho sản phẩm này. Câu hỏi về số liệu → escalate.""",
f"""> Số liệu dưới đây **đã đối chiếu ticket Jira Released**, cập nhật tới {d['asof']}.
> Mục nào ghi "chưa có số" thì agent **không trả lời — escalate**.
>
> Điều kiện thực tế của từng khách vẫn phải tra hệ thống.""")
    open(path, 'w', encoding='utf-8').write(s)
    changed += 1

print(f'Đã fill {changed} file.')
