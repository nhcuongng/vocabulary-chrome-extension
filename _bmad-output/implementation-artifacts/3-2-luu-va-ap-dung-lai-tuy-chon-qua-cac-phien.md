# Story 3.2: Lưu và áp dụng lại tùy chọn qua các phiên

Status: done

## Story

As a người học tiếng Anh,
I want tùy chọn của tôi được ghi nhớ lâu dài,
so that tôi không phải cấu hình lại mỗi lần mở trình duyệt.

## Acceptance Criteria

1. Given người dùng đã lưu tùy chọn auto-popup, When trình duyệt hoặc extension được khởi động lại, Then cài đặt được nạp lại từ storage local, And áp dụng đúng cho phiên duyệt mới.

## Tasks / Subtasks

- [x] Thiết kế persistence cho user preference trong local storage extension (AC: 1)
- [x] Nạp settings trong startup lifecycle của extension (AC: 1)
- [x] Áp dụng setting trước khi bắt selection events (AC: 1)
- [x] Viết test restart scenario và backward compatibility (AC: 1)

## Dev Notes

- Không lưu dữ liệu cá nhân ngoài phạm vi cài đặt cần thiết.
- Handle fallback khi storage lỗi hoặc key chưa tồn tại.

### Project Structure Notes

- Đặt schema version cho settings để hỗ trợ migrate về sau.
- Wrapper storage dùng chung để kiểm soát type-safe access.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 3, Story 3.2)
- Source: _bmad-output/planning-artifacts/prd.md (FR24, NFR8)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (45/45 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Added schema settings dùng chung tại `userSettings` với default rõ ràng, normalize, merge và backward compatibility cho dữ liệu legacy.
- Added `createChromeStorageSettingsAdapter()` để lưu/nạp preference qua `chrome.storage.local`, có subscribe runtime change và serialize write queue để tránh race condition.
- Added startup flow trong `createAutoPopupLookupController()` để nạp setting trước khi bắt selection events.
- Added restart scenario tests + backward compatibility tests cho persistence adapter.
- Completed code review cho phạm vi Story 3.2, không còn patch findings sau khi chạy full test suite.

### File List

- _bmad-output/implementation-artifacts/3-2-luu-va-ap-dung-lai-tuy-chon-qua-cac-phien.md
- src/shared/userSettings.js
- src/infrastructure/adapters/chromeStorageSettingsAdapter.js
- src/content/autoPopupLookupController.js
- tests/shared/userSettings.test.js
- tests/infrastructure/chromeStorageSettingsAdapter.test.js
- tests/content/autoPopupLookupController.test.js

### Change Log

- 2026-03-28: Hoàn tất Story 3.2 (settings persistence + startup apply + backward compatibility), đã chạy code review và test pass.
