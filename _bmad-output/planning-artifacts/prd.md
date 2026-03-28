---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/product-brief-vocabulary-chrome-extension.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/product-brief-vocabulary-chrome-extension-distillate.md
documentCounts:
  productBriefs: 2
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  domain: edtech
  complexity: medium
  projectContext: greenfield
workflowType: 'prd'
---

# Product Requirements Document - vocabulary-chrome-extension

**Author:** Cuongnguyenhuu
**Date:** 2026-03-28

## Executive Summary

Sản phẩm là một Chrome Extension học từ vựng tiếng Anh theo mô hình tra cứu tại chỗ: người dùng bôi đen một từ trên trang bất kỳ, hệ thống hiển thị popup định nghĩa gần vùng chọn. Trải nghiệm được định hình theo hành vi quen thuộc của Google Translate extension, nhưng đầu ra tập trung vào định nghĩa tiếng Anh để phục vụ học sâu thay vì dịch nhanh.

Giá trị cốt lõi là giảm chuyển ngữ cảnh khi đọc nội dung tiếng Anh: không mở tab mới, không copy/paste, không đứt mạch đọc. Nhóm người dùng chính gồm người học tiếng Anh chủ động (B1–C2), người luyện thi chuẩn hóa, và người đi làm đọc tài liệu chuyên môn.

### What Makes This Special

- **Definition-first learning:** ưu tiên hiểu sắc thái ngữ nghĩa và ngữ cảnh dùng từ.
- **In-context workflow:** tra cứu ngay trong trang đang đọc để tăng nhịp học liên tục.
- **UX quen thuộc, ma sát thấp:** giữ pattern highlight-to-popup mà người dùng đã hiểu.
- **Khả năng mở rộng học tập:** tạo nền tảng cho các tính năng ghi nhớ từ vựng sau MVP.

## Project Classification

- **Project Type:** `web_app` (browser extension chạy trên Chrome, tương tác trực tiếp với nội dung web)
- **Domain:** `edtech`
- **Complexity:** `medium`
- **Project Context:** `greenfield`

## Success Criteria

### User Success

- Người dùng tra cứu được nghĩa của từ đã bôi đen trong tối đa 2 thao tác và không rời trang.
- Người dùng hiểu nghĩa đủ để tiếp tục đọc đoạn văn đang xem mà không cần mở công cụ khác.
- Trải nghiệm popup không che khuất nội dung trọng tâm quá mức và có thể đóng/mở lại dễ dàng.

### Business Success

- Đạt tỷ lệ giữ lại tuần 1 (W1 retention) cho cohort beta theo ngưỡng do đội sản phẩm đặt trước khi phát hành public.
- Đạt mức tra cứu trung bình/người dùng/ngày phản ánh hành vi học lặp lại.
- Tăng trưởng cài đặt tự nhiên qua kênh Chrome Web Store và cộng đồng học tiếng Anh mục tiêu.

### Technical Success

- Lookup thành công (trả kết quả hoặc fallback rõ ràng) đạt $\ge 95\%$.
- Tỷ lệ lỗi parser do thay đổi cấu trúc nguồn được phát hiện sớm qua logging và xử lý an toàn.
- Hệ thống vận hành ổn định trên các trang có DOM phức tạp phổ biến.

### Measurable Outcomes

- $\ge 70\%$ lookup hoàn tất trong dưới 1.5 giây ở điều kiện mạng ổn định.
- $\ge 95\%$ yêu cầu lookup có trạng thái kết thúc hữu ích (success/not found/error có hướng dẫn).
- Tỷ lệ người dùng thực hiện lookup lặp lại trong 7 ngày đạt mục tiêu beta đã định.

## Product Scope

### MVP - Minimum Viable Product

- Bôi đen 1 từ tiếng Anh trên trang web bất kỳ để mở popup.
- Chuẩn hóa từ đầu vào (lowercase, bỏ ký tự thừa, xử lý dấu câu).
- Lấy và hiển thị dữ liệu cốt lõi từ trang dictionary tương ứng.
- Có trạng thái `loading`, `success`, `not found`, `error`.
- Có tuỳ chọn bật/tắt auto popup khi bôi đen.

### Growth Features (Post-MVP)

- Lịch sử từ đã tra và cụm từ thường gặp.
- Bộ lọc theo ngữ cảnh đọc (học thuật, business, technology).
- Tích hợp xuất danh sách từ (Anki/Notion/Google Sheets).

### Vision (Future)

- Cá nhân hóa lộ trình từ vựng theo hành vi đọc của từng người dùng.
- Gợi ý collocation/synonym theo ngữ cảnh câu.
- Cơ chế ghi nhớ dài hạn (spaced repetition nhẹ) trong luồng duyệt web.

## User Journeys

### Journey 1 - Primary User Success Path (Linh, IELTS learner)

**Opening scene:** Linh đọc bài báo tiếng Anh, gặp từ “test” trong ngữ cảnh học thuật và không muốn mất mạch đọc.

**Rising action:** Linh bôi đen từ. Popup xuất hiện ngay cạnh vùng chọn. Hệ thống trả về headword, pronunciation cơ bản và nghĩa chính.

**Climax:** Linh hiểu nghĩa trong ngữ cảnh chỉ sau vài giây, không đổi tab.

**Resolution:** Linh tiếp tục đọc bài liền mạch, tạo cảm giác học hiệu quả và ít mệt hơn.

### Journey 2 - Primary User Edge Case (Minh, office worker)

**Opening scene:** Minh bôi đen một cụm từ có dấu câu bám theo hoặc có typo.

**Rising action:** Hệ thống chuẩn hóa token, thử lookup, không tìm thấy kết quả chính xác.

**Climax:** Popup hiển thị trạng thái `not found` kèm gợi ý thao tác (bôi đen lại 1 từ, bỏ dấu câu, thử từ gốc).

**Resolution:** Minh sửa thao tác và tra cứu thành công, giảm bực bội so với lỗi im lặng.

### Journey 3 - Admin/Operations Journey (Product operator)

**Opening scene:** Sau khi phát hành beta, operator theo dõi tỷ lệ lỗi lookup theo phiên bản extension.

**Rising action:** Operator thấy lỗi parser tăng đột biến do thay đổi cấu trúc nguồn.

**Climax:** Operator dùng log ẩn danh để xác định module parse lỗi và ưu tiên hotfix.

**Resolution:** Phiên bản vá được phát hành, tỷ lệ lỗi quay về ngưỡng chấp nhận.

### Journey 4 - Support/Troubleshooting Journey

**Opening scene:** Người dùng phản ánh popup không hiện ở một số website có cơ chế selection đặc biệt.

**Rising action:** Support thu thập URL mẫu, tái hiện vấn đề, kiểm tra event selection và lớp chặn overlay.

**Climax:** Team bổ sung fallback lắng nghe selection-change và kiểm tra quyền content script.

**Resolution:** Tỷ lệ failure trên nhóm trang đó giảm rõ rệt.

### Journey Requirements Summary

- Cần engine nhận diện/chuẩn hóa từ ổn định trên nhiều kiểu DOM.
- Cần UX trạng thái rõ ràng cho mọi nhánh lookup.
- Cần telemetry tối thiểu để vận hành và sửa lỗi parser nhanh.
- Cần quy trình support tái hiện lỗi theo URL và điều kiện trang.

## Domain-Specific Requirements

### Compliance & Regulatory

- Tuân thủ chính sách Chrome Web Store về quyền riêng tư, mô tả quyền truy cập và mục đích sử dụng dữ liệu.
- Tuân thủ điều khoản sử dụng nguồn dữ liệu từ Vocabulary.com; không triển khai cơ chế thu thập hàng loạt để tạo bản sao cơ sở dữ liệu.
- Chuẩn bị cơ chế attribution/citation phù hợp khi hiển thị nội dung trích xuất.

### Technical Constraints

- Không lưu dữ liệu nhạy cảm không cần thiết; chỉ lưu dữ liệu vận hành tối thiểu.
- Thiết kế parser phòng thủ (defensive parsing) và fallback an toàn khi cấu trúc nguồn thay đổi.
- Áp dụng rate-limit + cache để giảm tải truy vấn và giảm rủi ro bị chặn nguồn.

### Integration Requirements

- Tích hợp ổn định với content scripts trong nhiều loại website (news/blog/docs).
- Tương thích với cơ chế quyền của Manifest V3 và lifecycle của service worker.
- Luồng lookup phải chịu lỗi mạng và timeout mà không làm treo UI.

### Risk Mitigations

- Rủi ro pháp lý: chốt chiến lược sử dụng dữ liệu và review pháp lý trước public launch.
- Rủi ro kỹ thuật: tách adapter nguồn dữ liệu để đổi parser nhanh khi nguồn thay đổi.
- Rủi ro UX: cung cấp nhánh `not found/error` có hướng dẫn hành động rõ ràng.

## Innovation & Novel Patterns

Sản phẩm không theo hướng đột phá công nghệ hoàn toàn mới; điểm mạnh là **kết hợp đúng** giữa hành vi highlight quen thuộc và nội dung định nghĩa phục vụ học sâu. Mục tiêu chính ở giai đoạn này là execution excellence thay vì innovation theater.

## Web App Specific Requirements

### Project-Type Overview

Extension hoạt động như một lớp tương tác nhẹ trên web pages, ưu tiên tốc độ phản hồi, ổn định selection handling, và khả năng render popup nhất quán trên môi trường DOM không đồng nhất.

### Technical Architecture Considerations

- Browser matrix: hỗ trợ Chrome stable hiện hành; có kế hoạch kiểm thử tương thích với Chromium-based browsers ở phase sau.
- Responsive overlay: popup giữ khả năng đọc tốt trên viewport nhỏ/lớn và zoom level khác nhau.
- Performance targets: tối ưu thời gian từ selection đến first-content-paint của popup.
- Accessibility baseline: keyboard dismiss, focus rõ ràng, semantic labels cơ bản.

### Browser Behavior & Selection Model

- Theo dõi selection change, mouseup, context menu một cách an toàn để tránh trigger sai.
- Tránh xung đột với thành phần nổi của trang (tooltips, ads overlays, modals).
- Có chiến lược debounce để tránh lookup lặp khi selection thay đổi liên tục.

### Implementation Considerations

- Tách module `selection`, `lookup`, `parser`, `popup-render` để giảm coupling.
- Có test matrix theo nhóm trang tiêu biểu: static content, SPA, docs editors.
- Không đưa yêu cầu SEO vì không áp dụng cho extension popup workflow.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP + Experience MVP (giải quyết pain tra từ tại chỗ với trải nghiệm ma sát thấp).

**Resource Requirements:** 1 dev extension + 1 dev frontend nhẹ + 1 QA part-time + 1 PM/PO.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- Journey tra cứu thành công cho user chính.
- Journey not-found/error recovery.
- Journey vận hành tối thiểu qua telemetry và xử lý sự cố.

**Must-Have Capabilities:**

- Highlight-to-popup lookup.
- Chuẩn hóa token đầu vào.
- Parse + hiển thị nghĩa cốt lõi.
- Trạng thái loading/success/not-found/error.
- Tùy chọn auto-show.
- Logging lỗi cơ bản.

### Post-MVP Features

**Phase 2 (Post-MVP):**

- Lịch sử từ đã tra.
- Export từ vựng.
- Cải thiện coverage trang phức tạp và tối ưu parser.

**Phase 3 (Expansion):**

- Nhắc ôn từ thông minh.
- Cá nhân hóa theo ngữ cảnh đọc.
- Hệ sinh thái tích hợp học từ bên thứ ba.

### Risk Mitigation Strategy

**Technical Risks:** parser gãy khi nguồn đổi cấu trúc → tách adapter + fallback + monitoring lỗi.

**Market Risks:** người dùng thấy “không khác dictionary khác” → nhấn mạnh positioning definition-first + in-context.

**Resource Risks:** thiếu nhân lực vận hành parser → khóa chặt phạm vi MVP, dời tính năng nâng cao sau.

## Functional Requirements

### Selection & Lookup Trigger

- FR1: Người dùng có thể bôi đen một từ tiếng Anh trên trang web để khởi tạo tra cứu.
- FR2: Hệ thống có thể xác định selection hiện tại và trích xuất token mục tiêu.
- FR3: Hệ thống có thể ngăn kích hoạt lookup khi selection rỗng hoặc không hợp lệ.
- FR4: Người dùng có thể bật/tắt chế độ tự động hiện popup khi bôi đen.

### Token Processing

- FR5: Hệ thống có thể chuẩn hóa token đầu vào (chữ thường, loại ký tự thừa).
- FR6: Hệ thống có thể xử lý dấu câu bám trước/sau từ để tăng tỷ lệ tra cứu đúng.
- FR7: Hệ thống có thể giới hạn tra cứu mặc định cho một từ đơn trong MVP.
- FR8: Hệ thống có thể trả trạng thái không hợp lệ khi token không đáp ứng quy tắc lookup.

### Dictionary Data Retrieval

- FR9: Hệ thống có thể xây dựng URL dictionary tương ứng theo headword chuẩn hóa.
- FR10: Hệ thống có thể gửi yêu cầu lookup và nhận phản hồi trong ngữ cảnh extension.
- FR11: Hệ thống có thể áp dụng timeout cho yêu cầu lookup để tránh treo UI.
- FR12: Hệ thống có thể thực hiện retry có kiểm soát cho lỗi tạm thời.

### Parsing & Data Mapping

- FR13: Hệ thống có thể trích xuất các trường dữ liệu cốt lõi (headword, pronunciation, định nghĩa chính).
- FR14: Hệ thống có thể suy luận `not found` khi không có dữ liệu khả dụng cho từ.
- FR15: Hệ thống có thể fallback sang thông báo lỗi thân thiện khi parse thất bại.
- FR16: Hệ thống có thể ánh xạ dữ liệu parse về định dạng hiển thị thống nhất cho popup.

### Popup Presentation

- FR17: Hệ thống có thể hiển thị popup gần vùng selection của người dùng.
- FR18: Người dùng có thể đóng popup thủ công.
- FR19: Hệ thống có thể hiển thị trạng thái `loading` trong thời gian lookup.
- FR20: Hệ thống có thể hiển thị trạng thái `success` với thông tin từ vựng cốt lõi.
- FR21: Hệ thống có thể hiển thị trạng thái `not found` kèm hướng dẫn thao tác lại.
- FR22: Hệ thống có thể hiển thị trạng thái `error` khi có lỗi mạng hoặc parse.

### Settings & Preferences

- FR23: Người dùng có thể cấu hình hành vi auto popup trong phần cài đặt extension.
- FR24: Hệ thống có thể lưu và áp dụng lại cài đặt người dùng giữa các phiên duyệt.

### Observability & Support

- FR25: Hệ thống có thể ghi nhận sự kiện lookup thành công/thất bại ở mức ẩn danh.
- FR26: Hệ thống có thể ghi nhận loại lỗi chính (network, timeout, parse, invalid token).
- FR27: Hệ thống có thể hỗ trợ truy vết sự cố theo phiên bản extension.

### Compliance & Governance

- FR28: Hệ thống có thể hiển thị thông tin nguồn/attribution theo chính sách đã phê duyệt.
- FR29: Hệ thống có thể vận hành với cơ chế giới hạn truy vấn để tránh khai thác hệ thống nguồn quá mức.
- FR30: Hệ thống có thể cung cấp mô tả quyền truy cập dữ liệu rõ ràng trong tài liệu phát hành.

## Non-Functional Requirements

### Performance

- NFR1: Thời gian từ lúc selection hoàn tất đến khi popup có nội dung đầu tiên phải dưới 1.5 giây cho ít nhất $70\%$ truy vấn trong điều kiện mạng ổn định.
- NFR2: Thời gian render trạng thái `loading` sau trigger lookup phải dưới 200 ms.
- NFR3: Lookup timeout mặc định không vượt quá 3 giây trước khi chuyển sang trạng thái lỗi có hướng dẫn.

### Reliability

- NFR4: Tỷ lệ lookup có kết thúc hữu ích (`success/not found/error`) đạt tối thiểu $95\%$.
- NFR5: Khi parser lỗi, hệ thống phải luôn trả về trạng thái lỗi an toàn, không làm hỏng trang đang xem.
- NFR6: Cơ chế retry không vượt quá số lần giới hạn cấu hình để tránh vòng lặp lỗi.

### Security & Privacy

- NFR7: Không lưu nội dung trang web đầy đủ hoặc dữ liệu cá nhân không cần thiết.
- NFR8: Dữ liệu cài đặt người dùng lưu cục bộ theo cơ chế storage an toàn của extension.
- NFR9: Toàn bộ luồng truy vấn phải sử dụng kết nối bảo mật (HTTPS) khi truy cập nguồn dữ liệu.

### Accessibility

- NFR10: Popup có thể đóng bằng bàn phím và có focus state rõ ràng.
- NFR11: Các thành phần chính trong popup có semantic label để hỗ trợ trình đọc màn hình cơ bản.

### Compatibility & Integration

- NFR12: Extension phải hoạt động ổn định trên phiên bản Chrome stable được hỗ trợ.
- NFR13: Hệ thống phải xử lý được các trang tĩnh và một tập trang SPA phổ biến trong test matrix MVP.

### Compliance

- NFR14: Nội dung disclosure quyền truy cập và quyền riêng tư phải khớp hành vi thực tế của extension trước khi phát hành.
- NFR15: Luồng khai thác dữ liệu phải tuân thủ chiến lược pháp lý đã phê duyệt cho nguồn Vocabulary.com.

## Traceability Matrix (Vision → Scope → FR)

- Vision “tra cứu không rời trang” → MVP highlight-to-popup → FR1, FR17, FR19-22.
- Vision “definition-first learning” → Parse dữ liệu định nghĩa cốt lõi → FR13, FR16, FR20.
- Vision “vận hành ổn định” → Logging + fallback → FR25-27, NFR4-6.
- Vision “tuân thủ khi scale” → Compliance controls → FR28-30, NFR14-15.

## Open Decisions Before Architecture

- Chốt mô hình dữ liệu hợp pháp và bền vững với nguồn Vocabulary.com trước khi lock kiến trúc.
- Chốt mức độ “giống Google Translate” ở hành vi auto-show, trigger và shortcut.
- Chốt bộ quy tắc tokenization cuối cùng cho các edge cases (hyphenated words, apostrophes, proper nouns).

## Next Planning Recommendations

- Dùng PRD này làm đầu vào cho `Create UX` và `Create Architecture`.
- Khi viết epics/stories, bắt buộc trace từng story về FR tương ứng.
- Thiết lập QA checklist bám theo User Journeys + NFR performance/reliability ngay từ sprint đầu.
