---
title: Index — catalog KB Ops/CSKH
audience: [ops, po]
last_verified: 2026-10-06
owner: dung.pham2
status: generated
---

<!-- AUTO:start — sinh bằng `node tools/kb-index.mjs`, đừng sửa tay -->

# Index

64 trang. **Đọc index trước, rồi mới mở trang chi tiết.**
Cần tra theo ý định ("muốn biết X thì xem đâu") thì xem [[kb/README]].

## Bắt đầu từ đây

| Trang | Nội dung | Cập nhật |
|---|---|---|
| [[kb/README]] — Hướng dẫn dùng KB Lending | kb/ chỉ chứa kiến thức sản phẩm và vận hành — thứ cần để trả lời khách và xử lý | 2026-10-06 |
| [[kb/glossary]] — Thuật ngữ Lending | Lãi phạt lãi chậm — chưa triển khai. Có trong chính sách của nhiều sản phẩm, nhưng | 2026-09-30 |
| [[kb/index]] — Index — catalog KB Ops/CSKH | 64 trang. Đọc index trước, rồi mới mở trang chi tiết. | 2026-10-06 |
| [[kb/product-matrix]] — Ma trận Đối tác × Sản phẩm × Kênh | - Kênh — api = đối tác tự làm app, gọi API Cake · dop = webview Cake nhúng vào app đối tác · cake = làm trên app Cake. | 2026-09-30 |
| [[kb/reject-messages]] — Thông báo từ chối hồ sơ — tra cứu | Khách thường nhắc lại nguyên văn câu thông báo trên màn hình. Dùng bảng này để biết | 2026-09-30 |

## Vận hành

| Trang | Nội dung | Cập nhật |
|---|---|---|
| [[kb/operations/README]] — Vận hành — quy trình, mã lỗi và case mẫu | Gặp một ticket chưa biết xử lý sao: | 2026-10-04 |
| [[kb/operations/case-doi-so-dien-thoai]] — Case mẫu — KH muốn đổi số điện thoại khi đang có ví/khoản vay | Ví dụ gốc: "KH mở ví được duyệt nhưng chưa ký, giờ muốn đổi sđt khác thì có đổi được không?" | 2026-10-04 |
| [[kb/operations/case-ket-user-sign]] — Case mẫu — khoản vay kẹt USER_SIGN sau khi đã giải ngân | Ca phổ biến nhất của nhóm giải ngân. Ví dụ gốc: SVK-11748 (CAKE_payday, 2026-10-02). | 2026-10-05 |
| [[kb/operations/luong-giai-ngan]] — Luồng giải ngân & trạng thái khoản vay — theo nhóm sản phẩm | Mỗi nhóm sản phẩm giải ngân một kiểu. Trước khi kết luận "đã giải ngân đủ bước", | 2026-10-06 |
| [[kb/operations/luong-van]] — Thanh toán nợ qua VAN — dùng chung mọi sản phẩm | Luồng dùng chung cho tất cả sản phẩm, không riêng MWG Paylater. | 2026-10-02 |
| [[kb/operations/ma-loi-api]] — Mã lỗi API & cách xử lý | Sinh từ tools/scan/troubleshoot.json bằng tools/gen-ops-docs.py. | 2026-10-02 |
| [[kb/operations/quy-trinh-sau-vay]] — Quy trình sau vay — thanh toán, quét nợ, tất toán | Mambu ghi channel autoCollection vẫn có thể là khách tự thanh toán. Phải xem Identity trong workflow: | 2026-10-02 |
| [[kb/operations/quy-trinh-xu-ly]] — Quy trình xử lý ticket vận hành | Nguồn: file Troubleshoot Lending Ops.xls — 15 tab. Parse bằng tools/parse-troubleshoot.py, | 2026-10-05 |

## Sản phẩm — tổng quan theo loại

| Trang | Nội dung | Cập nhật |
|---|---|---|
| [[kb/products/cashloan/faq]] — Câu hỏi thường gặp — Cashloan (Cake) | Câu trả lời mẫu cho câu hỏi hay gặp. Mọi câu liên quan tới con số cụ thể của khoản vay | 2026-09-30 |
| [[kb/products/cashloan/loan-management]] — Quản lý khoản vay — Cashloan (Cake) | Khách trả góp hàng tháng vào một ngày cố định. Trả chậm phát sinh phạt trên cả gốc | 2026-09-30 |
| [[kb/products/cashloan/onboarding]] — Đăng ký vay — Cashloan (Cake) | Khách đăng ký vay ngay trên app Cake. Bắt buộc xác thực NFC căn cước cả khi đăng ký | 2026-09-30 |
| [[kb/products/cashloan/overview]] — Tổng quan — Cashloan (Cake) | Cashloan là khoản vay tiền mặt trả góp hàng tháng. Với sản phẩm của chính Cake | 2026-09-30 |
| [[kb/products/od/faq]] — Câu hỏi thường gặp — Overdraft | Q: Thấu chi là gì? | 2026-10-01 |
| [[kb/products/od/loan-management]] — Quản lý thấu chi — Overdraft | Thấu chi là hạn mức quay vòng, không phải vay từng lần. | 2026-10-01 |
| [[kb/products/od/onboarding]] — Mở hạn mức thấu chi — Overdraft | Khác mọi sản phẩm khác: hạn mức dựa trên sổ tiết kiệm của khách tại Cake, | 2026-10-01 |
| [[kb/products/od/overview]] — Tổng quan — Overdraft (thấu chi) | Thấu chi: khách được tiêu vượt số dư trong một hạn mức, không phải vay từng lần. | 2026-10-01 |
| [[kb/products/payday/faq]] — Câu hỏi thường gặp — Payday | Q: Tôi trả khi nào? | 2026-10-01 |
| [[kb/products/payday/loan-management]] — Quản lý khoản vay — Payday | Không áp công thức trả góp của Cashloan sang Payday. | 2026-10-01 |
| [[kb/products/payday/onboarding]] — Đăng ký vay — Payday | Payday đi theo đúng luồng onboarding chung của nền tảng. Chi tiết từng màn hình: | 2026-10-01 |
| [[kb/products/payday/overview]] — Tổng quan — Payday | Payday là khoản vay ngắn ngày, số tiền nhỏ, trả gốc và lãi một lần vào cuối kỳ | 2026-09-30 |
| [[kb/products/paylater/faq]] — Câu hỏi thường gặp — Paylater | Q: Tôi được cấp hạn mức 5 triệu nghĩa là đã nhận 5 triệu? | 2026-10-01 |
| [[kb/products/paylater/loan-management]] — Quản lý hạn mức — Paylater | Mỗi kỳ khách chọn: | 2026-10-01 |
| [[kb/products/paylater/onboarding]] — Mở hạn mức — Paylater | Khách mở hạn mức, không phải vay một khoản. Màn ký hợp đồng hiển thị | 2026-10-01 |
| [[kb/products/paylater/overview]] — Tổng quan — Paylater (ví trả sau) | Hạn mức quay vòng để chi tiêu, trả theo sao kê hàng tháng. Cơ chế phí khác hẳn | 2026-10-01 |

## Sản phẩm — theo đối tác

| Trang | Nội dung | Cập nhật |
|---|---|---|
| [[kb/products/cashloan/partners/be/be_cashloan]] — Cashloan — BeGroup (Be_Cashloan) | Nguồn: PL-13946, live 2026-09-03. | 2026-09-30 |
| [[kb/products/cashloan/partners/cake-affiliate/cake_cl_affiliate]] — Cashloan — Cake (affiliate) (CAKE_cl_affiliate) | Nguồn: PL-12047, | 2026-09-30 |
| [[kb/products/cashloan/partners/datavn/vnhub_cashloan]] — Cashloan — DataVN (VNHUB_cashloan) | Khoản vay còn dư nợ vẫn thanh toán và tất toán được trên app Cake — xem cake-app. | 2026-09-30 |
| [[kb/products/cashloan/partners/klp/klp_cashloan]] — Cashloan — KLP (KLP_cashloan) | Nguồn: PL-10318, live 2026-08-22. | 2026-09-30 |
| [[kb/products/cashloan/partners/mbf/overview]] — Cashloan — MobiFone (MBF) | Vay tiền mặt cho khách MobiFone, đăng ký qua webview Cake nhúng trong app My MobiFone. | 2026-09-30 |
| [[kb/products/cashloan/partners/misa/misa_cashloan]] — Cashloan — MISA (MISA_cashloan) | Sản phẩm cho chủ hộ kinh doanh / chủ doanh nghiệp dùng phần mềm MISA (AMIS kế toán, | 2026-09-30 |
| [[kb/products/cashloan/partners/mwg/mwg_cashloan]] — Cashloan — MWG (MWG_cashloan) | Nhóm BHXH ≥ 6 triệu và được LOS xếp risk_group = 1 hưởng lãi thấp hơn ~9 điểm. | 2026-09-30 |
| [[kb/products/cashloan/partners/mwg/mwg_cl_online]] — Cashloan — MWG (MWG_cl_online) | Khác MWG_cashloan (kênh cửa hàng): sản phẩm này bán trên kênh online. | 2026-09-30 |
| [[kb/products/cashloan/partners/ngs/ngs_cashloan]] — Cashloan — NGS (NGS_cashloan) | Khoản vay còn dư nợ vẫn thanh toán và tất toán được trên app Cake — xem cake-app. | 2026-09-30 |
| [[kb/products/cashloan/partners/vds/viettel_cashloan]] — Cashloan — VDS (Viettel Money) (Viettel_Cashloan) | Chia 24 mã sản phẩm theo 4 phân khúc × 6 bậc rủi ro. | 2026-09-30 |
| [[kb/products/cashloan/partners/vds/vt_cashloan_s]] — Cashloan — VDS (Viettel Money) (VT_Cashloan_S) | Sản phẩm vay trên lương — lãi thấp hơn hẳn Cashloan thường. | 2026-09-30 |
| [[kb/products/cashloan/partners/vds/vtpo_cashloan]] — Cashloan — VDS (Viettel Money) (VTPO_cashloan) | Khoản vay còn dư nợ vẫn thanh toán và tất toán được trên app Cake — xem cake-app. | 2026-09-30 |
| [[kb/products/cashloan/partners/vnpay/vnp_cashloan]] — Cashloan — VNPAY (VNP_cashloan) | prin_not_d + prin_d + prin_over_d + int_not_d + int_d + pen_d + (rate × prin_not_d) | 2026-09-30 |
| [[kb/products/cashloan/partners/vnpost/vpo_cashloan]] — Cashloan — Vnpost (VPO_cashloan) | Sản phẩm hưu trí (VPCL_ASXH, hạn mức tới 300 triệu, lãi 13,5%) là sản phẩm riêng — | 2026-09-30 |
| [[kb/products/cashloan/partners/vnpost/vpo_cl_pension]] — Cashloan — Vnpost (VPO_cl_pension) | Sản phẩm cho người hưu trí — điều kiện khác hẳn phần còn lại của danh mục: | 2026-09-30 |
| [[kb/products/cashloan/partners/zalopay/zlp_cashloan]] — Cashloan — ZaloPay (ZLP_cashloan) | Tăng từ 2–50 triệu / 3–48 tháng. Nguồn: PL-12533, live 2026-05-08. | 2026-09-30 |
| [[kb/products/od/partners/cake/cake_overdraft]] — Od — Cake (CAKE_overdraft) | Thấu chi có tài sản bảo đảm là sổ tiết kiệm. Overdraft v2, live 2026-09-03. | 2026-09-30 |
| [[kb/products/od/partners/cake/cake_overdraft_td]] — Od — Cake (CAKE_overdraft_TD) | Thấu chi có tài sản bảo đảm là sổ tiết kiệm. Cấu hình hạn mức và lãi suất: xem cake_overdraft. | 2026-09-30 |
| [[kb/products/payday/partners/be/be_payday]] — Payday — BeGroup (BE_payday) | Nguồn: PL-12940, | 2026-09-30 |
| [[kb/products/payday/partners/cake/cake_payday]] — Payday — Cake (CAKE_payday) | Nguồn: lãi suất PL-12681 (55% → 59%), | 2026-09-30 |
| [[kb/products/payday/partners/fiza/overview]] — Payday — FIZA | Vay ngắn ngày cho khách FIZA. Số tiền nhỏ, trả gốc và lãi một lần vào cuối kỳ. | 2026-09-30 |
| [[kb/products/payday/partners/mwg/mwg_payday]] — Payday — MWG (MWG_payday) | Nâng hạn mức lên 6 triệu từ PL-12919 (live 2026-06-10). | 2026-09-30 |
| [[kb/products/payday/partners/vds/pd_viettel]] — Payday — VDS (Viettel Money) (PD_Viettel) | Phạt gốc chậm: 150% × lãi suất trong hạn × dư nợ gốc chậm × số ngày chậm. | 2026-09-30 |
| [[kb/products/payday/partners/vds/vt_payday_s]] — Payday — VDS (Viettel Money) (VT_Payday_S) | Sản phẩm vay trên lương — lãi suất 0%, không phạt trả chậm. | 2026-09-30 |
| [[kb/products/payday/partners/vnpay/vnp_payday]] — Payday — VNPAY (VNP_payday) | Số tiền nhận nợ = số tiền phê duyệt + phí bảo hiểm. Giải ngân vào tài khoản Cake của | 2026-09-30 |
| [[kb/products/payday/partners/zalopay/zlp_payday]] — Payday — ZaloPay (ZLP_payday) | Khách bị từ chối nếu CCCD có địa chỉ thường trú thuộc một số tỉnh, hoặc không đạt các | 2026-09-30 |
| [[kb/products/paylater/partners/be/be_paylater]] — Paylater — BeGroup (BE_paylater) | Thanh toán tối thiểu = 30% dư nợ gốc + lãi phát sinh. Toàn bộ = tổng dư nợ gốc + lãi phát sinh. | 2026-09-30 |
| [[kb/products/paylater/partners/fpt/fpt_paylater]] — Paylater — FPT (FPT_paylater) | Khoản vay còn dư nợ vẫn thanh toán và tất toán được trên app Cake — xem cake-app. | 2026-09-30 |
| [[kb/products/paylater/partners/mwg/mwg_paylater]] — Paylater — MWG (MWG_paylater) | Nâng hạn mức lên 60 triệu từ PL-14106 (live 2026-08-25). | 2026-09-30 |
| [[kb/products/paylater/partners/vds/vds_paylater]] — Paylater — VDS (Viettel Money) (VDS_paylater) | Thanh toán: tối thiểu = 30% dư nợ gốc + lãi phát sinh · toàn bộ = tổng dư nợ gốc + lãi phát sinh. | 2026-09-30 |
| [[kb/products/paylater/partners/vds/vds_paylater_epass]] — Paylater — VDS (Viettel Money) (VDS_paylater_epass) | Khoản vay còn dư nợ vẫn thanh toán và tất toán được trên app Cake — xem cake-app. | 2026-09-30 |
| [[kb/products/paylater/partners/vnpay/vnp_paylater]] — Paylater — VNPAY (VNP_paylater) | - Tối thiểu = 30% dư nợ sao kê (gốc + lãi + phí sử dụng hạn mức) | 2026-09-30 |

## Kênh

| Trang | Nội dung | Cập nhật |
|---|---|---|
| [[kb/channels/cake-app]] — Kênh app Cake | Khách thao tác trực tiếp trên app Cake: xem khoản vay, tra dư nợ, thanh toán, tất toán. | 2026-09-30 |
| [[kb/channels/dop]] — Kênh DOP — webview Cake trong app đối tác | Cake làm giao diện webview, nhúng vào app của đối tác. Khách không rời app đối tác | 2026-10-06 |
| [[kb/channels/native-api]] — Kênh Native API — đối tác tự làm app | Đối tác tự xây toàn bộ giao diện trên app của họ, gọi API Cake ở phía sau. | 2026-10-06 |

---

Thống kê: **64 trang**, **198 liên kết chéo**.
Kiểm tra sức khoẻ wiki: `node tools/kb-lint.mjs`.

<!-- AUTO:end -->
