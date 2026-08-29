# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.5] - 2026-08-29

### 🚀 Added
- **Word Family (Họ từ liên quan)**:
  - Tích hợp bóc tách cây họ từ `<vcom:wordfamily>` từ Vocabulary.com.
  - Sắp xếp vị trí Word Family ở dưới cùng (sau các định nghĩa chính) để người dùng xem định nghĩa nhanh nhất.
  - Mặc định ở trạng thái đóng (`collapsed`), hiển thị badge số lượng từ phái sinh `✭ Word Family (N)`.
  - Hỗ trợ đầy đủ Dark Mode.
- **Biến thể chia từ Guard (Inflection Protection)**:
  - Nhận diện các biến thể chia động từ / số nhiều thông thường (`-ed`, `-ing`, `-s`, `-es`, `-d`, `-ied`...).
  - Vô hiệu hóa click và chuyển con trỏ chuột sang `not-allowed` cho các dạng chia từ để tránh gửi request tra cứu dư thừa.
  - Giữ nguyên khả năng click tra cứu cho các từ phái sinh thực thụ (danh từ, tính từ, tiền tố phái sinh).
- **Thanh Lịch sử Tìm kiếm phân trang dạng Slide 5 từ**:
  - Phân trang lịch sử tra cứu thành từng slide 5 từ cố định.
  - Bổ sung nút chuyển slide `‹` và `›` ở hai đầu, tự động disable khi ở slide đầu / slide cuối.
  - Giữ nguyên thứ tự từ trong lịch sử khi người dùng click vào chip từ để xem lại định nghĩa (không bị đẩy lên đầu).

### 🔄 Changed
- Gỡ bỏ 2 nút điều hướng Back $(\leftarrow)$ và Forward $(\rightarrow)$ trên header bar để popup gọn gàng và thoáng hơn.
- Cải thiện trải nghiệm Shadow DOM và cô lập sự kiện `stopPropagation` trên các tương tác popup.

### 🧪 Tests & Quality
- Bổ sung bộ kiểm thử `isInflectedForm` trong `tests/domain/wordInflectionUtils.test.js`.
- Bổ sung kiểm thử phân trang slide và bảo toàn thứ tự từ trong `tests/content/popupManagerNavigation.test.js`.
- Toàn bộ 98/98 unit tests & integration tests đều vượt qua (100% PASS).
- Vượt qua Release Quality Gate và Google Chrome Web Store Permissions Audit.

---

## [0.1.4] - 2026-08-29

### 🚀 Added
- Popup Search inline trên Action Popup với auto-focus và hướng dẫn phím tắt.
- Tự động nạp cấu hình và lưu trữ lịch sử 50 từ trong `chrome.storage.local`.
