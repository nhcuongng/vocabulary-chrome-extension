---
title: "Product Brief Distillate: vocabulary-chrome-extension"
type: llm-distillate
source: "product-brief-vocabulary-chrome-extension.md"
created: "2026-03-28T12:00:00Z"
purpose: "Token-efficient context for downstream PRD creation"
---

## Product Intent (Core)

- Mục tiêu sản phẩm: Chrome extension học từ vựng tiếng Anh theo hành vi highlight nhanh trên trang web.
- UX tham chiếu: gần giống Google Translate extension (highlight/right-click -> popup gần vùng chọn).
- Điểm khác biệt chính: không trả về bản dịch ngắn; ưu tiên định nghĩa tiếng Anh giàu ngữ cảnh phục vụ học từ.
- Nguồn nội dung mục tiêu: trang dictionary của Vocabulary.com theo URL dạng `https://www.vocabulary.com/dictionary/{word}`.
- Ví dụ chuẩn cần bảo toàn: từ `test` ánh xạ đến trang `https://www.vocabulary.com/dictionary/test` và hiển thị popup tương tự ảnh mẫu.

## Requirements Hints (Ưu tiên cho PRD)

- Cần bắt sự kiện chọn từ tiếng Anh trên webpage bất kỳ, xử lý được hành vi highlight bằng chuột.
- Popup phải hiển thị nhanh, không phá layout trang, neo theo vùng text selection.
- Trạng thái bắt buộc trong UI: loading, success, not found, error.
- Cần cơ chế chuẩn hóa từ đầu vào (lowercase, loại ký tự thừa, xử lý dấu câu bám từ).
- Cần tuỳ chọn bật/tắt auto-popup khi bôi đen để tránh gây phiền.
- Cần fallback khi từ không hợp lệ (proper noun, typo, ký tự đặc biệt, cụm nhiều từ).
- Cần giới hạn tần suất gọi dữ liệu + cache cục bộ để cải thiện latency và giảm tải nguồn.
- Cần chuẩn bị nội dung disclosure quyền riêng tư/phạm vi truy cập theo policy Chrome Web Store.

## Technical Context & Constraints

- Nền tảng: Manifest V3 Chrome Extension (service worker, content script, popup/overlay).
- Cần tách lớp: `selection detection` → `lookup pipeline` → `render popup`.
- Parser phải chịu được thay đổi cấu trúc HTML ở nguồn (defensive parsing + graceful degradation).
- Nên có lớp adapter dữ liệu để dễ thay nguồn nếu cần (không hard-code parser vào UI component).
- Cần thiết kế retry có kiểm soát và timeout ngắn để tránh treo UX.
- Cần logging cơ bản (ẩn danh) cho lỗi lookup/parsing để debug sau phát hành.

## Competitive Intelligence (Condensed)

- Thị trường Chrome Web Store có nhiều extension dictionary/vocabulary với pattern highlight lookup.
- Google Translate extension đang là benchmark hành vi UX và kỳ vọng tốc độ phản hồi.
- Nhiều đối thủ mạnh về “dịch nhanh”, ít sản phẩm nhấn mạnh “definition-first learning” với trải nghiệm popup tối giản.
- Cơ hội định vị: “learn in context” cho nhóm người dùng đọc tài liệu dài, không muốn đổi tab.

## User & Value Signals

- Nhóm chính: người học tiếng Anh chủ động B1–C2, cần hiểu sắc thái từ trong ngữ cảnh.
- Nhóm phụ: người luyện thi IELTS/TOEFL/SAT/GRE; người đi làm đọc tài liệu chuyên ngành.
- Giá trị cốt lõi: giảm context switching, giữ flow đọc, tăng xác suất ghi nhớ do học nghĩa ngay lúc gặp từ.
- “Aha moment”: highlight từ khó và hiểu ngay ý nghĩa + ngữ cảnh mà không rời trang.

## Scope Signals

### In scope (MVP)

- Highlight 1 từ tiếng Anh -> popup định nghĩa.
- Hiển thị dữ liệu cốt lõi: headword, pronunciation cơ bản, nghĩa chính/mô tả ngắn.
- Có trạng thái loading/error/not-found.
- Có tuỳ chọn hành vi auto-show.

### Out of scope (MVP)

- Đồng bộ tài khoản đa thiết bị.
- Flashcard đầy đủ/spaced repetition hoàn chỉnh.
- Dịch đa ngôn ngữ và phân tích câu dài bằng AI.

## Legal / Compliance Critical Notes

- Terms of Vocabulary.com có nội dung hạn chế systematic retrieval/scraping/indexing/extraction; đây là rủi ro số 1 trước khi scale.
- Cần chốt chiến lược tuân thủ trước release rộng: xin phép/thoả thuận sử dụng, giới hạn truy vấn, trích dẫn/attribution phù hợp, và phương án fallback nếu không được phép khai thác trực tiếp.
- Cần tránh mô hình thu thập hàng loạt để tạo cơ sở dữ liệu sao chép nội dung từ nguồn.
- Cần rà soát chính sách bản quyền và điều khoản của Chrome Web Store để mô tả đúng luồng dữ liệu.

## Success Metrics Hints

- Lookup latency mục tiêu: phần lớn truy vấn dưới 1.5 giây trong điều kiện mạng ổn định.
- Lookup success rate mục tiêu: >= 95% có kết quả hoặc fallback rõ ràng.
- Early adoption: theo dõi lookup/user/day và W1 retention cho cohort beta đầu.

## Rejected / Deferred Ideas

- Ý tưởng “dịch đa ngôn ngữ ngay MVP” — deferred để giữ định vị definition-first và giảm phức tạp.
- Ý tưởng “flashcard đầy đủ trong extension ngay MVP” — deferred sang phase sau để tập trung core lookup UX.
- Ý tưởng “AI phân tích phrase/câu dài trong v1” — deferred do tăng độ phức tạp và chi phí vận hành.

## Open Questions for PRD (Must Resolve)

- Mô hình dữ liệu hợp pháp và bền vững nào để lấy nội dung định nghĩa từ nguồn mục tiêu?
- Mức độ tương đồng chính xác với UX Google Translate cần chuẩn hoá đến đâu (shortcut, icon, auto-popup policy)?
- Bộ rule xử lý token đầu vào thế nào để giảm lỗi lookup nhưng không bỏ sót từ hợp lệ?
- Popup hiển thị bao nhiêu thông tin ở mặc định để cân bằng tốc độ đọc và chiều sâu học?
- Bộ tiêu chí QA cross-site nào để đảm bảo hoạt động ổn trên các trang có DOM phức tạp?

## Suggested Next-Step Inputs for PRD Workflow

- Dùng song song hai file: brief hoàn chỉnh + distillate này làm nguồn vào PRD.
- Trong PRD cần tạo riêng mục “Compliance Strategy” với decision record rõ ràng trước khi chốt kiến trúc kỹ thuật.
- Nên khóa “MVP boundary” thật chặt để tránh scope creep từ các tính năng học nâng cao.
