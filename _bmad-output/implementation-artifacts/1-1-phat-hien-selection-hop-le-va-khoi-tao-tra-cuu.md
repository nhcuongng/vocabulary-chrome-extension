# Story 1.1: Phát hiện selection hợp lệ và khởi tạo tra cứu

Status: done

## Story

As a người học tiếng Anh,
I want extension nhận diện chính xác selection hợp lệ,
so that tôi có thể bắt đầu tra cứu ngay tại vị trí đang đọc.

## Acceptance Criteria

1. Given người dùng bôi đen một từ tiếng Anh hợp lệ, When sự kiện selection được bắt bởi content script, Then hệ thống tạo yêu cầu lookup mới, And không tạo nhiều trigger trùng lặp trong một thao tác chọn từ.
2. Given selection rỗng hoặc không hợp lệ, When hệ thống chạy bước xác thực selection, Then popup không được mở, And không gửi request lookup ra service worker.

## Tasks / Subtasks

- [x] Thiết kế bộ bắt sự kiện selection đa điểm (`mouseup`, `touchend`, `keyup`) với debounce 150ms (AC: 1)
  - [x] Chuẩn hóa luồng lấy selection text và bounding rect
  - [x] Chặn trigger trùng lặp trong cùng một tương tác
- [x] Xây dựng validation selection/token đầu vào (AC: 2)
  - [x] Từ chối selection rỗng, whitespace-only, hoặc chứa nhiều token cho MVP
  - [x] Trả lý do invalid để UI không mở popup
- [x] Tạo contract request gửi sang service worker khi hợp lệ (AC: 1)
  - [x] Tagged union response cho nhánh lỗi/hợp lệ
- [x] Viết test cho luồng trigger và validate (AC: 1,2)

## Dev Notes

- Bám kiến trúc event-driven giữa content script và service worker.
- Không gọi network ở bước này nếu token invalid.
- Ưu tiên tránh side-effect lên DOM host page.

### Project Structure Notes

- Đặt logic detection ở content-script module; messaging contract dùng shared types.
- Không trộn UI rendering với detection logic.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.1)
- Source: _bmad-output/planning-artifacts/architecture.md (AR5, AR7)
- Source: _bmad-output/planning-artifacts/prd.md (FR1, FR2, FR3)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (4/4 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Implemented selection detection controller with `mouseup`/`touchend`/`keyup` listeners and configurable debounce (default 150ms).
- Added selection snapshot pipeline for normalized text + bounding rect extraction without mutating host page DOM.
- Added duplicate trigger guard using selection fingerprint + dedupe window to prevent duplicate lookup requests in the same interaction.
- Implemented selection/token validation with explicit invalid reasons (`empty-selection`, `multi-token-selection`, `invalid-token-selection`, `missing-selection-rect`).
- Added lookup request contract for content script → service worker with tagged-union decision states (`valid`, `invalid`, `duplicate`).
- Added automated tests for trigger flow, debounce behavior, duplicate suppression, and validation branches.
- Code review (automatic) completed: no patch/defer findings, story approved.

### File List

- _bmad-output/implementation-artifacts/1-1-phat-hien-selection-hop-le-va-khoi-tao-tra-cuu.md
- package.json
- README.md
- src/shared/lookupContract.js
- src/content/selectionDetection.js
- tests/content/selectionDetection.test.js
