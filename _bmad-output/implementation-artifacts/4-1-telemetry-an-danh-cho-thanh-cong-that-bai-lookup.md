# Story 4.1: Telemetry ẩn danh cho thành công/thất bại lookup

Status: ready-for-dev

## Story

As a product operator,
I want hệ thống ghi nhận sự kiện lookup và phân loại lỗi,
so that tôi có thể theo dõi sức khỏe sản phẩm và truy vết sự cố.

## Acceptance Criteria

1. Given một lookup kết thúc, When hệ thống ghi log sự kiện, Then sự kiện được lưu ở dạng ẩn danh với loại kết quả (success/not-found/error), And kèm phân loại lỗi chính khi có lỗi (network/timeout/parse/invalid token).
2. Given operator cần truy vết lỗi theo phiên bản, When đọc dữ liệu telemetry cục bộ, Then có thể lọc và xem sự kiện theo version extension, And không chứa dữ liệu nhận dạng cá nhân.

## Tasks / Subtasks

- [ ] Thiết kế telemetry event schema ẩn danh cho kết quả lookup (AC: 1)
- [ ] Ghi event theo taxonomy lỗi chuẩn (AC: 1)
- [ ] Gắn version extension vào payload để truy vết (AC: 2)
- [ ] Viết test bảo đảm không log PII (AC: 2)

## Dev Notes

- Dữ liệu phải tối thiểu hóa theo nguyên tắc privacy by design.
- Chuẩn hóa event names để hỗ trợ phân tích sau này.

### Project Structure Notes

- Telemetry module độc lập, không phụ thuộc UI component.
- Shared event type dùng chung giữa lookup pipeline và logger.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 4, Story 4.1)
- Source: _bmad-output/planning-artifacts/prd.md (FR25, FR26, FR27, NFR7)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

### Completion Notes List

- Story context created by Scrum Master.

### File List

- _bmad-output/implementation-artifacts/4-1-telemetry-an-danh-cho-thanh-cong-that-bai-lookup.md
