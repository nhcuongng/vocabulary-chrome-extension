# Agent Guidelines & Permissions - vocabulary-chrome-extension

## Tool Permissions & Git Rules
- Full permission to run commands (`npm test`, `npm run build`, etc.)
- Full permission to view and edit files across `src/`, `tests/`, `docs/`, `_bmad-output/`
- Full permission to invoke subagents and run background tasks
- **Git Commit Rule**: KHÔNG được tự động chạy lệnh `git commit` hoặc `git push` trừ khi người dùng yêu cầu trực tiếp.
- **Quy tắc Lập Kế Hoạch (Planning Rule)**: Trước khi bắt đầu thực hiện bất kỳ tác vụ/thay đổi nào, LUÔN in kế hoạch triển khai (plan) rõ ràng ra màn hình cho người dùng theo dõi.
- **Quy trình Nâng Version (Release Workflow)**: Mỗi khi người dùng yêu cầu "nâng version" hoặc tương tự, thực hiện đầy đủ quy trình:
  1. In kế hoạch thực hiện nâng version ra màn hình.
  2. Nâng version đồng bộ trong `package.json` và `manifest.json`.
  3. Ghi chi tiết các thay đổi mới vào `CHANGELOG.md`.
  4. Chạy kiểm thử `npm test` và build bundle `npm run build`.
  5. Tạo Git commit và đóng Git tag (ví dụ: `v0.3.0`).

