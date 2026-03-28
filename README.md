
# vocabulary-chrome-extension

![Node.js Docker Image Documentation](./assets/example.png)

> **Tra cứu định nghĩa tiếng Anh sâu – Giữ mạch đọc, học ngay tại chỗ.**

---

## 🚀 Định vị sản phẩm

**vocabulary-chrome-extension** là tiện ích Chrome dành cho:
- Người học tiếng Anh chủ động (B1–C2), đọc báo/tài liệu tiếng Anh hàng ngày.
- Sinh viên luyện thi IELTS/TOEFL/SAT/GRE.
- Người đi làm cần đọc tài liệu chuyên ngành tiếng Anh.

**Sứ mệnh:** Giúp bạn hiểu sắc thái từ vựng trong ngữ cảnh thực tế, không cần rời trang, không ngắt mạch đọc, không chỉ dịch nghĩa ngắn.

---

## 🌟 Điểm khác biệt

- **Definition-first learning:** Ưu tiên định nghĩa tiếng Anh học thuật, không chỉ dịch máy.
- **In-context workflow:** Tra cứu ngay trên trang đang đọc, popup xuất hiện cạnh vùng chọn.
- **UX tối giản, tốc độ cao:** Pattern highlight-to-popup quen thuộc, phản hồi nhanh, không phá layout.
- **Nguồn dữ liệu chất lượng:** Vocabulary.com – định nghĩa sâu, ví dụ thực tế, phát âm chuẩn.
- **Tuân thủ pháp lý & minh bạch:** Chỉ truy vấn khi cần, attribution rõ ràng, không thu thập dữ liệu cá nhân.

---

## 🎯 Giá trị cốt lõi cho người dùng

- Không cần mở tab mới, không copy/paste, không đứt mạch đọc.
- Hiểu nghĩa từ ngay trong ngữ cảnh, tăng xác suất ghi nhớ lâu dài.
- Trải nghiệm popup không che khuất nội dung, dễ đóng/mở lại.
- Tùy chọn bật/tắt auto-popup để kiểm soát trải nghiệm.

---

## 🛠️ Tính năng chính (MVP)

- Bôi đen 1 từ tiếng Anh trên bất kỳ trang web nào để mở popup định nghĩa.
- Chuẩn hóa token đầu vào (lowercase, loại ký tự thừa, xử lý dấu câu).
- Lấy và hiển thị dữ liệu cốt lõi từ Vocabulary.com (headword, phát âm, nghĩa chính).
- Trạng thái rõ ràng: `loading`, `success`, `not found`, `error` (có hướng dẫn thao tác lại).
- Tùy chọn bật/tắt auto-popup.
- Logging lỗi cơ bản (ẩn danh) để cải thiện chất lượng.

---

## 🔒 Minh bạch dữ liệu & quyền truy cập

- **Nguồn dữ liệu:** Vocabulary.com ([https://www.vocabulary.com/](https://www.vocabulary.com/))
- **Quyền truy cập:**
  - `activeTab`: Đọc selection do người dùng chọn.
  - `scripting`: Nạp content script để bắt selection & render popup.
  - `storage`: Lưu cài đặt và telemetry ẩn danh cục bộ.
  - `host:https://www.vocabulary.com/*`: Truy vấn định nghĩa.
- **Checklist phát hành:** Xem [docs/transparency-release-checklist.md](docs/transparency-release-checklist.md)

---

## ⚡ Scripts

- `npm test`: Chạy toàn bộ unit test bằng Node test runner.
- `npm run audit:permissions`: Đối chiếu quyền trong `manifest.json` với disclosure runtime.
- `npm run build`: Build extension, kiểm tra alignment quyền/disclosure.
- `npm run quality:gate`: Chuỗi kiểm tra release-readiness (`test` → `audit:permissions` → `build`), lưu bằng chứng tại `docs/release-evidence/latest-release-readiness.md`.

---

## 🔭 Tầm nhìn phát triển

- Lịch sử từ đã tra, xuất danh sách từ sang Anki/Notion/Google Sheets.
- Gợi ý collocation/synonym, cá nhân hóa theo lĩnh vực đọc.
- Cơ chế ghi nhớ dài hạn (spaced repetition nhẹ) ngay trong luồng duyệt web.

---

> "Highlight để tra, học để nhớ, minh bạch để tin dùng."
