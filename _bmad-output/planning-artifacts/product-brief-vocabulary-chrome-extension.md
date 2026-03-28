---
title: "Product Brief: vocabulary-chrome-extension"
status: "complete"
created: "2026-03-28T00:00:00Z"
updated: "2026-03-28T12:00:00Z"
inputs:
  - "/Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/prd.md"
---

## Executive Summary

Chúng ta xây dựng một Chrome Extension học từ vựng tiếng Anh theo mô hình tra nhanh “bôi đen từ → hiện popup” tương tự trải nghiệm Google Translate, nhưng đầu ra là **định nghĩa tiếng Anh chuyên sâu** lấy từ trang từ điển của Vocabulary.com (ví dụ: `https://www.vocabulary.com/dictionary/test`).

Giá trị cốt lõi là giữ nguyên luồng đọc: người dùng không phải mở tab mới, không bị ngắt mạch học. Extension phục vụ nhóm người học tiếng Anh (IELTS/TOEFL/SAT, người đi làm đọc tài liệu quốc tế, sinh viên) cần hiểu từ trong ngữ cảnh thực tế.

Thời điểm phù hợp để làm: hệ sinh thái Chrome extension cho tra cứu từ rất sôi động, người dùng đã quen với hành vi “highlight để tra”. Cơ hội khác biệt nằm ở việc tập trung vào **định nghĩa học thuật và ngữ nghĩa giàu ngữ cảnh** thay vì chỉ dịch nghĩa ngắn.

## Vấn đề

Hiện tại, nhiều công cụ phổ biến ưu tiên dịch song ngữ nhanh. Điều này hữu ích khi “hiểu tạm”, nhưng chưa tối ưu cho mục tiêu mở rộng vốn từ và hiểu sắc thái dùng từ.

Các bất tiện chính:

- Người học phải chuyển ngữ cảnh liên tục (mở tab dictionary, copy/paste từ).
- Nhiều popup dictionary hiện có chưa đồng nhất trải nghiệm hoặc thiên về “dịch” hơn là “học từ”.
- Thiếu luồng học tập trung vào định nghĩa, dạng từ, ví dụ và ngữ cảnh sử dụng ngay tại trang đang đọc.

## Giải pháp

Một Chrome Extension có các hành vi chính:

1. Người dùng bôi đen một từ tiếng Anh trên trang web bất kỳ.
2. Extension nhận diện từ hợp lệ, gọi nguồn dữ liệu từ trang từ điển Vocabulary.com theo URL chuẩn.
3. Popup xuất hiện gần vùng bôi đen, hiển thị nội dung định nghĩa theo phong cách tham chiếu ảnh mẫu (tiêu đề từ, phát âm, các nghĩa chính, mô tả ngắn).
4. Có trạng thái tải/lỗi/không tìm thấy rõ ràng.

Nguyên tắc sản phẩm: tra nhanh, đọc dễ, không phá luồng đọc.

## Điểm khác biệt

- **Definition-first**: ưu tiên học nghĩa tiếng Anh thay vì dịch máy.
- **In-context learning**: học ngay tại trang đang đọc, giảm friction.
- **UX quen thuộc**: tương tự hành vi Google Translate extension nên dễ onboard.
- **Nguồn nội dung giàu chiều sâu**: cấu trúc dictionary của Vocabulary.com phong phú cho mục tiêu học từ.

## Người dùng mục tiêu

### Primary

- Người học tiếng Anh chủ động (B1–C2), đọc báo/tài liệu tiếng Anh hàng ngày.
- Nhu cầu: hiểu từ nhanh nhưng vẫn giữ chất lượng học thuật của định nghĩa.

### Secondary

- Sinh viên luyện thi chuẩn hóa (IELTS/TOEFL/SAT/GRE).
- Người đi làm cần đọc tài liệu chuyên môn tiếng Anh.

## Tiêu chí thành công (Success Criteria)

### Product

- $\ge 70\%$ tra cứu hoàn tất trong dưới 1.5 giây (với mạng ổn định).
- Tỷ lệ tra cứu thành công (có dữ liệu hoặc fallback rõ ràng) $\ge 95\%$.
- Tỷ lệ popup hiển thị đúng vị trí/không che nội dung chính ở mức chấp nhận được trong các layout phổ biến.

### Adoption

- Tỷ lệ giữ lại tuần 1 (W1 retention) đạt mục tiêu ban đầu do team đặt ra sau beta.
- Số lượt tra cứu/người dùng/ngày phản ánh hành vi sử dụng lặp lại.

## Phạm vi phiên bản đầu (MVP Scope)

### In scope

- Highlight một từ tiếng Anh để mở popup.
- Tra nội dung từ trang dictionary tương ứng trên Vocabulary.com.
- Hiển thị phần thông tin cốt lõi trong popup theo layout nhất quán.
- Trạng thái loading/error/not-found.
- Tuỳ chọn bật/tắt auto popup khi bôi đen.

### Out of scope (MVP)

- Đồng bộ tài khoản đa thiết bị.
- Hệ thống flashcard đầy đủ trong extension.
- Dịch đa ngôn ngữ.
- Phân tích câu dài/phrase phức tạp bằng AI.

## Rủi ro & Cân nhắc quan trọng

- **Pháp lý/Terms of Use**: Vocabulary.com có điều khoản nghiêm ngặt về khai thác nội dung (bao gồm hạn chế systematic retrieval/scraping). Cần thiết kế phương án tuân thủ: xin phép, trích dẫn đúng, giới hạn tần suất, và ưu tiên cơ chế cho phép theo điều khoản.
- **Độ bền dữ liệu**: nếu cấu trúc HTML nguồn thay đổi, parser dễ hỏng.
- **Hiệu năng & anti-abuse**: cần caching/rate-limit để tránh gọi lặp quá mức.
- **Chrome Web Store policy**: minh bạch quyền truy cập dữ liệu trang và quyền riêng tư.

## Tại sao là bây giờ

- Người dùng đã quen pattern “highlight-to-lookup” nhờ các extension phổ biến.
- Nhu cầu học tiếng Anh qua nội dung thật (articles/docs/videos) ngày càng cao.
- Khoảng trống thị trường: trải nghiệm popup tối giản nhưng tối ưu cho học từ chuyên sâu thay vì chỉ dịch.

## Tầm nhìn 2–3 năm

Nếu MVP thành công, sản phẩm có thể phát triển thành trợ lý học từ vựng toàn diện trên trình duyệt:

- Word history + spaced repetition nhẹ.
- Cá nhân hóa theo lĩnh vực đọc (tech, business, science).
- Gợi ý collocations/synonyms theo ngữ cảnh.
- Tích hợp workflow học (Anki/Notion/Google Sheets) mà vẫn giữ “one-click frictionless”.

## Open Questions cho PRD

1. Cơ chế lấy dữ liệu nào tuân thủ Terms tốt nhất (link-out, trích dẫn giới hạn, hay xin quyền sử dụng)?
2. “Mức giống Google Translate” trong UX cần đến đâu (icon, shortcut, auto-show rules)?
3. Khi từ không hợp lệ (proper noun, typo, cụm từ), fallback UX ưu tiên gì?
4. Mức dữ liệu hiển thị mặc định trong popup (định nghĩa ngắn vs đầy đủ) để cân bằng tốc độ/độ sâu?
