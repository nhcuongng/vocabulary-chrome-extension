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
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/product-brief-fix-auto-popup-behavior.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/product-brief-fix-auto-popup-behavior-distillate.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/project-context.md
documentCounts:
  productBriefs: 2
  research: 0
  brainstorming: 0
  projectDocs: 1
classification:
  projectType: web_app
  domain: edtech
  complexity: medium
  projectContext: brownfield
workflowType: 'prd'
---

# Product Requirements Document - Fix Auto-Popup Behavior

**Author:** Cuongnguyenhuu
**Date:** 2026-03-30

## Executive Summary

Extension vocabulary-chrome-extension hiện có toggle auto-popup (FR4, FR23 trong PRD gốc) với UI và controller đã implement (Story 3.1), nhưng hành vi runtime chưa hoạt động đúng. Khi `autoPopupEnabled = false`, `autoPopupLookupController` tắt hoàn toàn selection detection — người dùng không có cách nào tra từ. Feature này cần hoàn thiện để cung cấp hai luồng trải nghiệm song song:

1. **Auto-popup BẬT** (mặc định): bôi đen từ → popup định nghĩa tự động hiển thị.
2. **Auto-popup TẮT**: bôi đen từ → icon kính lúp nhỏ xuất hiện → click icon → popup định nghĩa hiển thị.

Ngoài ra, thêm quick toggle checkbox trong browser action popup để chuyển đổi chế độ nhanh không cần mở settings.

### What Makes This Special

- **Dual-mode UX**: Người dùng kiểm soát mức độ tự động theo thói quen đọc — tự động cho học tập tập trung, thủ công khi cần kiểm soát.
- **Trigger icon pattern**: Mô hình quen thuộc từ Google Translate extension, giảm learning curve.
- **Quick toggle**: Chuyển đổi tức thì không rời trang, đồng bộ real-time qua Chrome Storage.

## Project Classification

- **Project Type:** `web_app` (Chrome extension chạy trên browser)
- **Domain:** `edtech` (học từ vựng tiếng Anh)
- **Complexity:** `medium`
- **Project Context:** `brownfield` (extension đã hoạt động, sửa/hoàn thiện feature có sẵn)

## Success Criteria

### User Success

- Người dùng bôi đen từ luôn nhận được phản hồi trực quan (popup tự động hoặc icon kính lúp) bất kể chế độ nào đang bật.
- Người dùng chuyển đổi chế độ auto-popup mà không cần reload trang hoặc mở settings riêng.
- Người dùng ở chế độ TẮT tra từ thành công trong tối đa 2 thao tác (bôi đen + click icon).

### Business Success

- Tỷ lệ người dùng giữ auto-popup TẮT nhưng vẫn tra từ đều đặn > 0 (chứng minh chế độ thủ công có giá trị thực).
- Giảm phản hồi tiêu cực dạng "extension không hoạt động" sau khi tắt auto-popup.

### Technical Success

- Cả hai chế độ hoạt động ổn định trên test matrix trang web hiện có (static content, SPA, docs).
- Không tạo regression trên luồng lookup hiện tại.
- Selection detection chạy liên tục ở cả hai chế độ mà không gây overhead đáng kể.

### Measurable Outcomes

- Icon kính lúp xuất hiện < 200ms sau khi selection hoàn tất (NFR2 từ PRD gốc).
- Click icon trigger lookup trong < 100ms.
- Chuyển đổi chế độ áp dụng tức thì (< 50ms) trên trang đang mở.
- 100% test pass cho cả hai luồng auto-popup ON và OFF.

## Product Scope

### MVP (Phase 1 — Feature này)

- Sửa `autoPopupLookupController` để selection detection vẫn hoạt động khi auto-popup OFF.
- Tạo component trigger icon (kính lúp) với logic hiển thị/ẩn/click.
- Kết nối trigger icon với lookup orchestrator hiện có.
- Thêm checkbox quick toggle trong browser action popup với hint text.
- Đảm bảo chuyển đổi chế độ real-time (từ cả popup lẫn settings page).
- Viết test cho cả hai luồng và quick toggle.

### Ngoài scope

- Thay đổi giao diện popup kết quả định nghĩa.
- Thay đổi nguồn dữ liệu hoặc parser.
- Hỗ trợ multi-word selection.
- Thêm setting mới ngoài auto-popup toggle.

## User Journeys

### Journey 1 — Tra từ tự động (Linh, IELTS learner, auto-popup ON)

**Opening scene:** Linh đọc bài báo tiếng Anh trên The Guardian, gặp từ "meticulous" và muốn hiểu nghĩa ngay.

**Rising action:** Linh bôi đen từ "meticulous". Popup loading skeleton xuất hiện ngay cạnh vùng chọn trong < 200ms. Hệ thống gửi lookup request và nhận kết quả.

**Climax:** Popup hiển thị headword, pronunciation và định nghĩa chính. Linh hiểu nghĩa trong ngữ cảnh chỉ sau vài giây.

**Resolution:** Linh tiếp tục đọc bài liền mạch. Chế độ auto-popup ON phù hợp với nhu cầu học tập tập trung.

### Journey 2 — Tra từ thủ công (Minh, office worker, auto-popup OFF)

**Opening scene:** Minh đọc báo cáo kỹ thuật tiếng Anh, thường xuyên bôi đen text để copy/paste. Auto-popup gây phiền vì popup xuất hiện mỗi lần select text.

**Rising action:** Minh tắt auto-popup qua quick toggle trong popup extension. Ngay lập tức, khi bôi đen từ "paradigm", thay vì popup tự động, một icon kính lúp nhỏ xuất hiện gần vùng chọn.

**Climax:** Minh click icon kính lúp → popup lookup hiển thị bình thường với định nghĩa. Khi bôi đen text khác để copy, không có popup không mong muốn — chỉ icon nhỏ xuất hiện và tự ẩn khi Minh click ra ngoài.

**Resolution:** Minh làm việc hiệu quả — tra từ khi cần, copy text thoải mái khi không cần tra. Chế độ thủ công phù hợp workflow đọc tài liệu chuyên môn.

### Journey 3 — Chuyển đổi chế độ nhanh (Linh, chuyển ngữ cảnh)

**Opening scene:** Linh đang đọc bài học với auto-popup ON. Cần chuyển sang đọc email công việc nơi bôi đen text là để reply, không phải tra từ.

**Rising action:** Linh click icon extension trên toolbar. Popup extension hiện checkbox "Auto-popup" đang checked với hint "Tự động hiện định nghĩa khi bôi đen từ". Linh uncheck.

**Climax:** Thay đổi áp dụng tức thì — trên tab email, bôi đen text giờ chỉ hiện icon kính lúp nhỏ thay vì popup tự động.

**Resolution:** Sau khi xong email, Linh check lại auto-popup qua quick toggle, quay lại chế độ học tập. Không cần mở settings, không cần reload.

### Journey 4 — Troubleshooting: icon bị che khuất (Support)

**Opening scene:** Người dùng phản ánh icon kính lúp không thấy trên một số website có overlay phức tạp.

**Rising action:** Support tái hiện vấn đề, xác định website có z-index cao trên tooltip layer.

**Climax:** Team điều chỉnh z-index của trigger icon hoặc kiểm tra Shadow DOM isolation để đảm bảo icon luôn hiển thị trên nội dung trang.

**Resolution:** Fix được deploy, icon hiển thị đúng trên nhóm trang có vấn đề.

### Journey Requirements Summary

- Cần trigger icon component với positioning, z-index, và click handling.
- Cần quick toggle UI trong browser action popup, đồng bộ real-time với content script.
- Cần selection detection luôn chạy ở cả hai chế độ, chỉ thay đổi hành động sau detection.
- Cần cleanup logic giữa icon và popup — không được xuất hiện đồng thời.
- Cần debounce để icon không nhấp nháy khi bôi đen nhanh liên tục.

## Domain-Specific Requirements

### Compliance & Regulatory

- Tuân thủ chính sách Chrome Web Store: mô tả quyền truy cập và hành vi extension phải khớp thực tế (auto-popup toggle phải hoạt động đúng như mô tả).
- Tuân thủ điều khoản Vocabulary.com: không thay đổi cơ chế truy vấn, giữ nguyên rate-limit và cache.

### Technical Constraints

- Shadow DOM isolation: trigger icon phải sử dụng cùng approach isolation với popup hiện tại để tránh style leakage.
- Event propagation: `stopPropagation()` trên pointer events bên trong trigger icon để tránh dismiss không mong muốn.
- Manifest V3 lifecycle: service worker có thể bị suspend — settings phải persist qua Chrome Storage, không lưu in-memory.

### Risk Mitigations

| Rủi ro | Giảm thiểu |
|--------|-----------|
| Icon kính lúp bị trang web che khuất (z-index) | Shadow DOM isolation + z-index cao, nhất quán với popup |
| Selection detection chạy liên tục gây overhead | Giữ nguyên debounce hiện có trong `selectionDetection.js` |
| Xung đột icon và popup khi chuyển mode | Cleanup icon trước khi render popup và ngược lại |
| Race condition khi đọc/ghi settings đồng thời | Sử dụng Chrome Storage onChanged event, không poll |

## Innovation & Novel Patterns

Không có đột phá công nghệ — đây là hoàn thiện execution cho feature MVP đã có. Giá trị nằm ở việc cung cấp pattern UX quen thuộc (trigger icon giống Google Translate) với chuyển đổi real-time mượt mà.

## Web App Specific Requirements

### Project-Type Overview

Chrome extension hoạt động như lớp tương tác nhẹ trên web pages. Feature auto-popup toggle ảnh hưởng đến cách extension phản ứng với text selection — tương tác cơ bản nhất.

### Technical Architecture Considerations

- **Browser behavior**: Selection detection phải lắng nghe `mouseup` event trên document, tôn trọng debounce, và xử lý edge case (selection trong `<input>`, `<textarea>`, `contenteditable`).
- **Responsive overlay**: Trigger icon phải hiển thị đúng vị trí trên mọi viewport size và zoom level.
- **Performance**: Icon render < 200ms sau selection (NFR2).
- **Accessibility**: Icon có semantic label, có thể dismiss bằng keyboard (Escape).

### Implementation Considerations

- Tái sử dụng logic positioning từ `popupPositioning.js` cho trigger icon.
- Trigger icon nên là component riêng biệt, tách khỏi popup renderer.
- Quick toggle trong browser action popup tái sử dụng `chromeStorageSettingsAdapter` subscribe mechanism.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — sửa hành vi bị hỏng và hoàn thiện feature đã có trong PRD gốc.

**Resource Requirements:** 1 dev (extension/frontend).

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey tra từ tự động (auto-popup ON).
- Journey tra từ thủ công qua trigger icon (auto-popup OFF).
- Journey chuyển đổi chế độ nhanh qua quick toggle.

**Must-Have Capabilities:**
- Selection detection luôn hoạt động ở cả hai chế độ.
- Trigger icon (kính lúp) hiển thị gần vùng selection khi auto-popup OFF.
- Click trigger icon → lookup flow bình thường.
- Quick toggle checkbox trong browser action popup.
- Real-time mode switching không cần reload.
- Cleanup giữa icon và popup — không đồng thời.

### Risk Mitigation Strategy

**Technical Risks:** z-index conflict, Shadow DOM isolation → tái sử dụng approach của popup hiện tại.
**Market Risks:** Không áp dụng — đây là sửa lỗi feature MVP.
**Resource Risks:** Feature scope nhỏ, 1 dev đủ xử lý.

## Functional Requirements

### Selection & Trigger Behavior

- FR1: Hệ thống có thể duy trì selection detection ở trạng thái active bất kể giá trị auto-popup setting.
- FR2: Hệ thống có thể xác định chế độ hiện tại (auto-popup ON/OFF) và chọn hành động phù hợp sau khi phát hiện selection hợp lệ.
- FR3: Hệ thống có thể hiển thị popup tự động khi auto-popup ON và phát hiện selection hợp lệ.
- FR4: Hệ thống có thể hiển thị trigger icon (kính lúp) khi auto-popup OFF và phát hiện selection hợp lệ.

### Trigger Icon

- FR5: Hệ thống có thể render trigger icon dạng kính lúp gần cuối vùng text đã chọn.
- FR6: Người dùng có thể click trigger icon để khởi tạo lookup flow cho từ đã chọn.
- FR7: Hệ thống có thể ẩn trigger icon khi người dùng click ra ngoài, bỏ chọn text, hoặc sau khi lookup flow được khởi tạo.
- FR8: Hệ thống có thể ngăn trigger icon và popup xuất hiện đồng thời.

### Quick Toggle

- FR9: Người dùng có thể bật/tắt auto-popup qua checkbox trong browser action popup.
- FR10: Hệ thống có thể hiển thị hint text giải thích hành vi auto-popup bên cạnh checkbox.
- FR11: Hệ thống có thể phản ánh đúng trạng thái hiện tại của `autoPopupEnabled` khi mở browser action popup.
- FR12: Hệ thống có thể áp dụng thay đổi setting tức thì trên trang đang mở khi người dùng toggle checkbox.

### Settings Synchronization

- FR13: Hệ thống có thể đồng bộ thay đổi auto-popup setting giữa browser action popup và settings page.
- FR14: Hệ thống có thể lưu và khôi phục auto-popup setting giữa các phiên duyệt qua Chrome Storage.
- FR15: Hệ thống có thể thông báo content script về thay đổi setting real-time qua Chrome Storage onChanged event.

## Non-Functional Requirements

### Performance

- NFR1: Trigger icon xuất hiện trong < 200ms sau khi selection hoàn tất.
- NFR2: Click trigger icon khởi tạo lookup flow trong < 100ms.
- NFR3: Chuyển đổi chế độ auto-popup áp dụng trên trang đang mở trong < 50ms.
- NFR4: Selection detection ở chế độ idle không tăng CPU usage đáng kể so với trạng thái hiện tại.

### Reliability

- NFR5: Không tạo regression trên luồng lookup hiện tại (auto-popup ON).
- NFR6: Trigger icon hiển thị đúng trên test matrix trang web hiện có (static content, SPA, docs editors).
- NFR7: Debounce ngăn trigger icon nhấp nháy khi user bôi đen text nhanh liên tục.

### Security & Privacy

- NFR8: Trigger icon sử dụng Shadow DOM isolation nhất quán với popup hiện tại.
- NFR9: Không lưu thêm dữ liệu ngoài `autoPopupEnabled` setting đã có.

### Accessibility

- NFR10: Trigger icon có semantic label mô tả chức năng ("Look up definition").
- NFR11: Trigger icon có thể dismiss bằng phím Escape.

### Compatibility

- NFR12: Feature hoạt động trên Chrome stable hiện hành.
- NFR13: Quick toggle tương thích với browser action popup hiện có, không phá vỡ layout.

## Traceability Matrix

| Vision | Scope | FR |
|--------|-------|-----|
| Dual-mode UX theo thói quen đọc | Selection detection luôn active | FR1, FR2 |
| Auto-popup ON giữ nguyên trải nghiệm | Popup tự động | FR3 |
| Auto-popup OFF với trigger icon | Trigger icon component | FR4, FR5, FR6, FR7, FR8 |
| Quick toggle không rời trang | Checkbox trong popup | FR9, FR10, FR11, FR12 |
| Real-time mode switching | Settings sync | FR13, FR14, FR15 |

## Open Decisions Before Implementation

- Trigger icon render bằng Shadow DOM hay inject trực tiếp? (khuyến nghị: nhất quán với popup hiện tại).
- Có hỗ trợ trigger icon trên selection trong `<input>`, `<textarea>`, `contenteditable` không? (khuyến nghị: giữ nguyên scope hiện tại của selection detection).
- Story 3.1 đánh dấu "done" — tạo story mới hay re-open? (khuyến nghị: tạo story mới vì scope thay đổi đáng kể).
