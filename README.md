# vocabulary-chrome-extension

MVP code cho Story 1.1 (selection detection + validation + request contract).

## Scripts

- `npm test`: chạy toàn bộ unit test bằng Node test runner.
- `npm run audit:permissions`: audit đối chiếu `manifest.json` với disclosure runtime.
- `npm run build`: build extension và fail sớm nếu permission/disclosure không aligned.
- `npm run quality:gate`: chạy chuỗi release-readiness (`test` → `audit:permissions` → `build`) và lưu bằng chứng tại `docs/release-evidence/latest-release-readiness.md`.

## Minh bạch dữ liệu & quyền truy cập

- Attribution nguồn dữ liệu: Vocabulary.com (`https://www.vocabulary.com/`).
- Disclosure quyền truy cập hiện tại trong runtime/UI:
  - `activeTab`: đọc selection do người dùng chủ động bôi đen.
  - `scripting`: nạp content script để bắt selection + render popup.
  - `storage`: lưu cài đặt và telemetry ẩn danh cục bộ.
  - `host:https://www.vocabulary.com/*`: truy vấn dữ liệu định nghĩa.
- Checklist trước phát hành: xem [docs/transparency-release-checklist.md](docs/transparency-release-checklist.md).
