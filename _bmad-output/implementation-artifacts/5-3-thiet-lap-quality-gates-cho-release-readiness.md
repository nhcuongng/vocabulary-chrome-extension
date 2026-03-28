# Story 5.3: Thiết lập quality gates cho release readiness

Status: done

## Story

As a team,
I want quy trình quality gate nhất quán trước release,
so that thay đổi mới không làm giảm chất lượng và tính tuân thủ.

## Acceptance Criteria

1. Given code chuẩn bị phát hành, When chạy pipeline kiểm tra, Then các bước test/lint (hoặc checklist quality tương đương) phải pass, And checklist minh bạch release được xác nhận đầy đủ.
2. Given có thay đổi liên quan permission/compliance, When pipeline chạy, Then audit permission-disclosure được thực thi, And kết quả được lưu làm bằng chứng release.

## Tasks / Subtasks

- [x] Thiết lập pipeline quality gate nhất quán cho release (AC: 1, 2)
  - [x] Thêm lệnh `npm run quality:gate` chạy tuần tự `test` → `audit:permissions` → `build`.
  - [x] Dừng pipeline ngay khi step thất bại để tránh release với trạng thái không an toàn.

- [x] Lưu bằng chứng release readiness từ pipeline (AC: 2)
  - [x] Tạo file evidence tự động tại `docs/release-evidence/latest-release-readiness.md`.
  - [x] Ghi rõ kết quả từng bước quality gate + snapshot permission/disclosure alignment.

- [x] Xác nhận checklist minh bạch trong quality gate (AC: 1)
  - [x] Kiểm tra template checklist có đầy đủ marker compliance bắt buộc.
  - [x] Bổ sung checklist item yêu cầu chạy quality gate trước release.

- [x] Bổ sung regression test cho quality gate baseline (AC: 1, 2)
  - [x] Thêm test kiểm tra sự tồn tại script quality gate và marker checklist.
  - [x] Mở rộng baseline test để đảm bảo package scripts khai báo gate commands.

## Dev Notes

- Repo chưa có lint tool riêng; quality gate được triển khai theo hướng “quality equivalent” gồm test + audit permission + build + checklist verification.
- Script gate tạo evidence file để phục vụ release review/CI artifacts.

### References

- Source: `_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.3)
- Source: `docs/transparency-release-checklist.md`
- Source: `scripts/audit-permissions.mjs`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅
- `npm run quality:gate` ✅

### Completion Notes List

- Thêm `scripts/release-quality-gate.mjs` để chạy release pipeline nhất quán và ghi evidence.
- Thêm npm script `quality:gate` và cập nhật tài liệu hướng dẫn vận hành.
- Gate script xác thực checklist template compliance + snapshot audit permission/disclosure từ manifest runtime.
- Mỗi lần chạy gate sẽ lưu báo cáo vào `docs/release-evidence/latest-release-readiness.md`.
- Bổ sung test hạ tầng để chống regression cấu hình quality gate.

### File List

- _bmad-output/implementation-artifacts/5-3-thiet-lap-quality-gates-cho-release-readiness.md
- scripts/release-quality-gate.mjs
- package.json
- tests/infrastructure/runtimeBaseline.test.js
- tests/infrastructure/releaseReadinessGate.test.js
- README.md
- docs/transparency-release-checklist.md

### Change Log

- 2026-03-28: Hoàn tất Story 5.3 (quality gate pipeline + release evidence + checklist verification + tests), chuyển trạng thái `done`.
