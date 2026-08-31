# Agent Guidelines & Permissions - vocabulary-chrome-extension

## Tool Permissions & Git Rules
- Full permission to run commands (`npm test`, `npm run build`, etc.)
- Full permission to view and edit files across `src/`, `tests/`, `docs/`, `_bmad-output/`
- Full permission to invoke subagents and run background tasks
- **Quy tắc Lập Kế Hoạch & Phê Duyệt (Plan Preview & User Approval Gate)**:
  1. Trước khi bắt đầu thực hiện bất kỳ tác vụ/thay đổi nào, LUÔN in kế hoạch triển khai (plan) chi tiết ra màn hình cho người dùng xem trước.
  2. **DỪNG LẠI và CHỜ người dùng xác nhận**: TUYỆT ĐỐI KHÔNG tự ý thực thi code, sửa đổi file hay chạy các thao tác thay đổi trạng thái khi chưa có sự xác nhận/đồng ý từ người dùng (ví dụ: người dùng phản hồi "ok", "tiến hành", "làm đi", "đồng ý").
  3. Chỉ khi người dùng đã xem xét kế hoạch và đồng ý thì mới bắt đầu tiến hành triển khai.
- **Chủ động gợi ý Commit (Post-Task Commit Suggestion)**:
  - Sau khi hoàn thành một bug fix hoặc một feature/task nhỏ và đã chạy `npm test` thành công, agent cần chủ động hỏi người dùng có muốn commit các thay đổi này hay không, kèm theo đề xuất commit message cụ thể (theo chuẩn conventional commits).
- **Quy tắc Ngôn ngữ Giao diện (English UI Only)**: Mọi text hiển thị trên giao diện người dùng (UI strings, button labels, tooltips, hints, placeholders, empty states, onboarding, error messages trên giao diện) bắt buộc 100% bằng tiếng Anh (English).
- **Quy trình Nâng Version (Release Workflow)**: Mỗi khi người dùng yêu cầu "nâng version" hoặc tương tự, thực hiện đầy đủ quy trình:
  1. In kế hoạch thực hiện nâng version ra màn hình và chờ người dùng xác nhận.
  2. Nâng version đồng bộ trong `package.json` và `manifest.json`.
  3. Ghi chi tiết các thay đổi mới vào `CHANGELOG.md`.
  4. Chạy kiểm thử `npm test` và build bundle `npm run build`.
  5. Tạo Git commit và đóng Git tag (ví dụ: `v0.3.0`).



