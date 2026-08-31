# Google Antigravity Configuration & Permissions - vocabulary-chrome-extension

## ⚡ Tool Execution & Permission Policy

### 1. Full Autonomous Tool Permissions (Auto-Approve)
- **Tự động thực thi**: Antigravity được cấp toàn quyền tự động thực thi các công cụ (tools) trong workspace này mà không cần yêu cầu xác nhận từng bước cho các tác vụ phát triển thông thường:
  - `run_command`: Chạy các lệnh kiểm thử (`npm test`, `node --test`), build script (`npm run build`, `npm run dev`), format, lint và audit.
  - `write_to_file` & `replace_file_content`: Tạo mới hoặc sửa đổi các file mã nguồn (`src/`, `tests/`, `docs/`, `_bmad-output/`).
  - `view_file`, `list_dir`, `find_by_name`, `grep_search`: Đọc và tìm kiếm trong codebase.
  - `invoke_subagent` & `manage_subagents`: Tạo và điều phối subagent phân tích / review.
- **Quy tắc an toàn & Git Policy**:
  - Không chạy các lệnh phá hủy hệ thống bên ngoài workspace (`rm -rf /`, sửa file hệ thống ngoài project).
  - Luôn đảm bảo chạy test (`npm test`) sau mỗi lần thay đổi mã nguồn để bảo toàn tính ổn định.
  - **Tuyệt đối KHÔNG tự động chạy lệnh `git commit` hoặc `git push`** trừ khi người dùng yêu cầu rõ ràng. Tất cả các thay đổi thông thường sẽ được giữ ở working directory để người dùng chủ động review.
  - **Quy tắc Lập Kế Hoạch & Phê Duyệt (Plan Preview & User Approval Gate)**: Luôn in kế hoạch triển khai (plan) chi tiết ra màn hình trước khi làm gì. **DỪNG LẠI và CHỜ người dùng preview và đồng ý**. Tuyệt đối không tự ý viết code/sửa file trong cùng lượt khi chưa được người dùng phê duyệt kế hoạch.
  - **Quy trình Nâng Version & Release**: Khi người dùng yêu cầu "nâng version" hoặc tương tự, thực hiện: (1) In kế hoạch ra màn hình và chờ phê duyệt, (2) Cập nhật version trong `package.json` và `manifest.json`, (3) Ghi changelog vào `CHANGELOG.md`, (4) Kiểm tra `npm test` & build `npm run build`, (5) Tạo commit và đóng tag `vX.Y.Z`.

---

## 🛠️ Project Context & Architecture

- **Platform**: Chrome Extension Manifest V3
- **Runtime**: Node.js (>=20), Vanilla JS (ESM), Chrome Extension APIs
- **UI Architecture**: Web Components / Shadow DOM Isolation, Tailwind CSS / DaisyUI classes
- **Testing Framework**: Native Node.js Test Runner (`node --test`)
- **Workflow System**: BMad Method (BMM) & Artifacts in `_bmad-output/`

---

## 📋 Best Practices & Coding Standards

1. **Tagged Union Response Contract**: Tất cả message giữa background và content scripts tuân thủ schema `{ status: 'success' | 'not-found' | 'error', data?, error? }`.
2. **Shadow DOM Style Isolation**: Popup UI được cô lập trong Shadow DOM để tránh xung đột CSS với trang web chủ.
3. **Event Propagation**: Luôn gọi `e.stopPropagation()` trên các sự kiện tương tác trong popup để tránh dismiss ngoài ý muốn.
4. **Cache & Rate-limiting**: Tuân thủ guardrails (Cache-first 30 ngày, Rate-limiting an toàn) đối với các request tra cứu Vocabulary.com.
5. **No PII**: Không lưu trữ bất kỳ thông tin nhạy cảm của người dùng trong telemetry hay storage.
