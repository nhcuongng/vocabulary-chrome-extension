# Checklist minh bạch trước release

## Mục tiêu

Đảm bảo attribution nguồn dữ liệu và disclosure quyền truy cập luôn khớp với hành vi thực tế của extension trước khi phát hành.

## Checklist bắt buộc

- [ ] Attribution hiển thị rõ nguồn: **Vocabulary.com** và URL nguồn chính thức.
- [ ] Popup render attribution từ nguồn chuẩn hóa (`complianceDisclosureCatalog`) thay vì hard-code rải rác.
- [ ] Disclosure mô tả đúng mục đích từng quyền: `activeTab`, `scripting`, `storage`, `host:https://www.vocabulary.com/*`.
- [ ] Không có quyền nào trong manifest mà không xuất hiện trong disclosure.
- [ ] Không có disclosure nào mô tả quyền mà manifest thực tế không khai báo.
- [ ] Nội dung disclosure khẳng định chỉ lưu **telemetry ẩn danh cục bộ**, không lưu PII.
- [ ] Đã chạy test:
  - `tests/application/complianceDisclosureCatalog.test.js`
  - `tests/content/popupRenderer.test.js`
- [ ] Đã chạy audit runtime permission/disclosure: `npm run audit:permissions`.
- [ ] Đã chạy quality gate trước release: `npm run quality:gate`.

## Bằng chứng kiểm tra đề xuất

- Kết quả audit từ `auditManifestPermissions()` với danh sách quyền của bản phát hành.
- Log lệnh `npm run audit:permissions` cho release review.
- Evidence report từ `docs/release-evidence/latest-release-readiness.md`.
- Ảnh hoặc snapshot popup có attribution/disclosure footer.
- Log CI cho test pass.
