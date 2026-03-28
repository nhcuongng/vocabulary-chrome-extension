# Story 5.2: Đồng bộ permission declarations với disclosure runtime

Status: done

## Story

As a product operator,
I want quyền truy cập khai báo trong manifest khớp nội dung disclosure,
so that sản phẩm minh bạch và giảm rủi ro compliance khi phát hành.

## Acceptance Criteria

1. Given manifest đã khai báo permissions/host_permissions, When chạy audit disclosure, Then hệ thống phát hiện quyền dư hoặc thiếu mô tả, And báo cáo alignment rõ ràng cho release review.
2. Given người dùng xem thông tin minh bạch, When popup/tài liệu hiển thị disclosure, Then nội dung khớp với manifest runtime thực tế, And không có quyền nào không giải thích được.

## Tasks / Subtasks

- [x] Tăng độ chính xác audit permission/disclosure trên manifest runtime thật (AC: 1)
  - [x] Bổ sung API report chi tiết từ catalog compliance để phục vụ release review.
  - [x] Đảm bảo audit trả danh sách quyền runtime/policy + missing/unexpected rõ ràng.

- [x] Thiết lập command audit độc lập cho release review (AC: 1)
  - [x] Thêm script `npm run audit:permissions` đọc `manifest.json` và in báo cáo alignment.
  - [x] Trả exit code khác 0 nếu misalignment để dùng trong quality gate.

- [x] Đồng bộ pipeline build với guardrail compliance runtime (AC: 1, 2)
  - [x] Tích hợp kiểm tra alignment permission/disclosure vào build validation.
  - [x] Fail build sớm khi phát hiện quyền dư hoặc thiếu disclosure.

- [x] Cập nhật tài liệu minh bạch để phản ánh audit runtime mới (AC: 2)
  - [x] Cập nhật README với script audit và hành vi build gate.
  - [x] Cập nhật checklist release để yêu cầu bằng chứng audit runtime.

- [x] Bổ sung test regression cho nhánh alignment report và manifest thực tế (AC: 1, 2)
  - [x] Test cho report API trong `tests/application/complianceDisclosureCatalog.test.js`.
  - [x] Test xác nhận manifest hiện tại aligned trong `tests/infrastructure/runtimeBaseline.test.js`.

## Dev Notes

- Story 5.2 tập trung vào **alignment runtime thật** giữa `manifest.json` và disclosure policy.
- Không mở rộng quyền mới trong manifest; chỉ tăng khả năng phát hiện sai lệch và bằng chứng release review.
- Build phải fail rõ lý do khi misalignment để giảm rủi ro compliance vào cuối sprint.

### References

- Source: `_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.2)
- Source: `src/application/complianceDisclosureCatalog.js`
- Source: `docs/transparency-release-checklist.md`
- Source: `README.md`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅
- `npm run audit:permissions` ✅
- `npm run build` ✅

### Completion Notes List

- Nâng cấp `complianceDisclosureCatalog` với `buildManifestDisclosureAuditReport()` để phục vụ release review bằng báo cáo có cấu trúc.
- `buildPermissionDisclosureSummary()` được build từ `PERMISSION_DISCLOSURE_ITEMS` để giảm drift giữa policy text và permission catalog.
- Bổ sung script `scripts/audit-permissions.mjs` + npm script `audit:permissions` để audit trực tiếp trên `manifest.json` runtime.
- Tích hợp audit report vào `scripts/build-extension.mjs`; build sẽ fail nếu phát hiện misalignment.
- Bổ sung test cho report API và test manifest runtime aligned trong baseline test.
- Cập nhật README + checklist minh bạch để yêu cầu bằng chứng audit runtime trước release.

### File List

- _bmad-output/implementation-artifacts/5-2-dong-bo-permission-declarations-voi-disclosure-runtime.md
- src/application/complianceDisclosureCatalog.js
- scripts/audit-permissions.mjs
- scripts/build-extension.mjs
- package.json
- tests/application/complianceDisclosureCatalog.test.js
- tests/infrastructure/runtimeBaseline.test.js
- README.md
- docs/transparency-release-checklist.md

### Change Log

- 2026-03-28: Hoàn tất Story 5.2 (runtime permission/disclosure alignment audit + build guardrail + docs/tests), chuyển trạng thái `done`.
