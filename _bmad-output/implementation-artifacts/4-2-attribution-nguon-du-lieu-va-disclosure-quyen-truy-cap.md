# Story 4.2: Attribution nguồn dữ liệu và disclosure quyền truy cập

Status: done

## Story

As a người dùng extension,
I want thấy rõ nguồn dữ liệu và quyền truy cập được sử dụng,
so that tôi tin tưởng sản phẩm minh bạch và đúng chính sách.

## Acceptance Criteria

1. Given người dùng xem popup hoặc trang thông tin extension, When hệ thống hiển thị thông tin nguồn dữ liệu, Then attribution được hiển thị theo chính sách đã phê duyệt, And nội dung rõ ràng, dễ hiểu.
2. Given người dùng xem disclosure quyền truy cập, When kiểm tra tài liệu phát hành hoặc màn hình thông tin, Then mô tả quyền truy cập khớp với hành vi thực tế của extension, And không có quyền dư thừa không giải thích được.

## Tasks / Subtasks

- [x] Soạn và hiển thị attribution text đúng chính sách (AC: 1)
- [x] Cập nhật disclosure permissions trong UI/tài liệu phát hành (AC: 2)
- [x] Đối chiếu manifest permissions với disclosure content (AC: 2)
- [x] Viết checklist kiểm tra minh bạch trước release (AC: 1,2)

## Dev Notes

- Nội dung disclosure phải đồng bộ với manifest tại mọi thời điểm.
- Tránh ngôn ngữ mơ hồ; ưu tiên rõ ràng, thân thiện.

### Project Structure Notes

- Văn bản pháp lý/attribution tách thành constants/config để dễ audit.
- UI chỉ render từ nguồn nội dung chuẩn hóa.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.2)
- Source: _bmad-output/planning-artifacts/prd.md (FR28, FR30, NFR14)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (57/57 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Added compliance catalog tập trung cho attribution + disclosure quyền truy cập, dùng làm single source of truth để audit.
- Updated popup renderer để luôn render attribution + permission disclosure footer từ nguồn nội dung chuẩn hóa.
- Added `auditManifestPermissions()` để đối chiếu quyền trong manifest/runtime với disclosure content và phát hiện quyền dư/thông tin thiếu.
- Added tài liệu release transparency checklist và cập nhật README mục minh bạch dữ liệu/quyền truy cập.
- Added tests cho attribution/disclosure content, nhánh audit misalignment, và hiển thị footer trong popup.
- Completed code review cho phạm vi Story 4.2 và đã fix toàn bộ findings (bao gồm logic `isAligned` khi thiếu disclosure item).

### File List

- _bmad-output/implementation-artifacts/4-2-attribution-nguon-du-lieu-va-disclosure-quyen-truy-cap.md
- src/application/complianceDisclosureCatalog.js
- src/content/popupRenderer.js
- README.md
- docs/transparency-release-checklist.md
- tests/application/complianceDisclosureCatalog.test.js
- tests/content/popupRenderer.test.js

### Change Log

- 2026-03-28: Hoàn tất Story 4.2 (attribution + disclosure + permission audit + release checklist), đã chạy code review và test pass.
