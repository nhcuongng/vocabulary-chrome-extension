# Story 4.2: Attribution nguồn dữ liệu và disclosure quyền truy cập

Status: ready-for-dev

## Story

As a người dùng extension,
I want thấy rõ nguồn dữ liệu và quyền truy cập được sử dụng,
so that tôi tin tưởng sản phẩm minh bạch và đúng chính sách.

## Acceptance Criteria

1. Given người dùng xem popup hoặc trang thông tin extension, When hệ thống hiển thị thông tin nguồn dữ liệu, Then attribution được hiển thị theo chính sách đã phê duyệt, And nội dung rõ ràng, dễ hiểu.
2. Given người dùng xem disclosure quyền truy cập, When kiểm tra tài liệu phát hành hoặc màn hình thông tin, Then mô tả quyền truy cập khớp với hành vi thực tế của extension, And không có quyền dư thừa không giải thích được.

## Tasks / Subtasks

- [ ] Soạn và hiển thị attribution text đúng chính sách (AC: 1)
- [ ] Cập nhật disclosure permissions trong UI/tài liệu phát hành (AC: 2)
- [ ] Đối chiếu manifest permissions với disclosure content (AC: 2)
- [ ] Viết checklist kiểm tra minh bạch trước release (AC: 1,2)

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

### Completion Notes List

- Story context created by Scrum Master.

### File List

- _bmad-output/implementation-artifacts/4-2-attribution-nguon-du-lieu-va-disclosure-quyen-truy-cap.md
