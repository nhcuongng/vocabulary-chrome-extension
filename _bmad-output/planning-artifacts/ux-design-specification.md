---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/prd.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/product-brief-vocabulary-chrome-extension.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/product-brief-vocabulary-chrome-extension-distillate.md
---

# UX Design Specification vocabulary-chrome-extension

**Author:** Cuongnguyenhuu
**Date:** 2026-03-28

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

Thiết kế trải nghiệm tra cứu từ vựng trong ngữ cảnh đọc web theo nguyên tắc “nhanh, rõ, không phá luồng đọc”. Khi người dùng bôi đen một từ tiếng Anh, popup định nghĩa xuất hiện gần vùng chọn, giúp hiểu nghĩa ngay tức thì mà không đổi tab. Trải nghiệm ưu tiên học sâu (definition-first) thay vì dịch nhanh.

### Target Users

- Người học tiếng Anh chủ động (B1–C2), thường xuyên đọc bài báo/tài liệu tiếng Anh và muốn giữ mạch đọc.
- Người luyện thi chuẩn hóa cần hiểu sắc thái từ và cách dùng.
- Người đi làm cần tra cứu nhanh thuật ngữ khi đọc tài liệu chuyên môn.

### Key Design Challenges

- Định vị popup ổn định trên nhiều loại website/DOM mà không che nội dung quan trọng.
- Xử lý token đầu vào đa dạng (dấu câu, typo, từ không hợp lệ) với fallback UX dễ hiểu.
- Cân bằng giữa tốc độ phản hồi và độ sâu thông tin hiển thị trong popup nhỏ gọn.

### Design Opportunities

- Tạo “micro-learning moment” ngay tại điểm người dùng gặp từ khó.
- Dùng interaction quen thuộc (highlight-to-popup) để giảm thời gian học cách dùng.
- Tối ưu trạng thái phản hồi để tăng tin cậy sản phẩm và giảm thất vọng khi lookup thất bại.

## Core User Experience

### Defining Experience

Trải nghiệm cốt lõi của sản phẩm là “tra nghĩa trong 1 nhịp đọc”: người dùng chọn một từ tiếng Anh ngay trên trang đang đọc và nhận định nghĩa tức thì trong popup cạnh vùng chọn. Giá trị UX nằm ở việc giảm ma sát thao tác và giữ liên tục dòng chú ý.

### Platform Strategy

- Nền tảng triển khai chính: Chrome extension (desktop-first).
- Mô hình tương tác chính: mouse selection + keyboard dismiss.
- Không ưu tiên offline trong MVP; ưu tiên tốc độ và độ ổn định online lookup.
- Thiết kế popup cần tương thích layout đa dạng của website (static pages, dynamic pages).

### Effortless Interactions

- Bôi đen từ là đủ để khởi tạo tra cứu (không cần chuyển tab/copy-paste).
- Popup xuất hiện gần vùng chọn, dễ đọc, dễ đóng.
- Trạng thái `loading`, `success`, `not found`, `error` luôn rõ ràng.
- Hệ thống tự chuẩn hóa token cơ bản để tăng xác suất tra cứu đúng.
- Cho phép bật/tắt auto-popup để phù hợp thói quen từng người dùng.

### Critical Success Moments

- Khoảnh khắc “aha”: người dùng gặp từ khó và hiểu ngay nghĩa trong vài giây mà không rời trang.
- Khoảnh khắc duy trì niềm tin: khi lookup lỗi hoặc không tìm thấy, UX vẫn chỉ dẫn rõ cách tiếp tục.
- Make-or-break flow: trigger đúng khi selection hợp lệ, không spam popup khi selection nhiễu.

### Experience Principles

- **Frictionless first:** luôn ưu tiên thao tác ít nhất để ra kết quả hữu ích.
- **Context-preserving:** không làm người dùng rời ngữ cảnh đọc.
- **Clarity under uncertainty:** mọi trạng thái đều có thông điệp và hướng hành động rõ.
- **Predictable behavior:** popup phản hồi nhất quán trên nhiều website.

## Desired Emotional Response

### Primary Emotional Goals

- Người dùng cảm thấy **tự tin** rằng họ hiểu đúng từ vừa gặp.
- Người dùng cảm thấy **liền mạch** khi đọc, không bị “vỡ flow”.
- Người dùng cảm thấy **tin cậy** vì hệ thống phản hồi nhất quán, kể cả khi lỗi.

### Emotional Journey Mapping

- **First contact:** “Ồ, thao tác rất đơn giản” (dễ tiếp cận).
- **Core action (highlight → popup):** “Nhanh và đúng lúc” (giảm căng thẳng khi gặp từ khó).
- **Task completed:** “Mình hiểu và đọc tiếp được ngay” (cảm giác tiến bộ).
- **When error/not found:** “Mình vẫn biết phải làm gì tiếp” (không bị bối rối).
- **Return usage:** “Công cụ này đáng giữ lại” (thói quen sử dụng lặp lại).

### Micro-Emotions

- Cần tăng: **Confidence**, **Trust**, **Relief**, **Accomplishment**.
- Cần giảm: **Confusion**, **Annoyance**, **Skepticism**, **Frustration**.
- Khoảnh khắc quyết định: 1–2 giây đầu sau khi bôi đen từ.

### Design Implications

- Muốn tạo **trust** → trạng thái hệ thống rõ ràng (`loading/success/not found/error`), thông điệp cụ thể.
- Muốn tạo **confidence** → nội dung popup nhất quán, dễ scan, nhấn mạnh nghĩa cốt lõi.
- Muốn tạo **relief** → popup xuất hiện đúng vị trí, dễ đóng, không che nội dung chính.
- Muốn tránh **annoyance** → có tùy chọn bật/tắt auto-popup và chống trigger nhiễu.

### Emotional Design Principles

- **Calm Clarity:** mọi phản hồi ngắn gọn, rõ nghĩa, không gây nhiễu.
- **Immediate Reassurance:** luôn cho người dùng biết hệ thống đang làm gì.
- **Low-Friction Mastery:** mỗi lần tra từ đều khiến người dùng thấy mình tiến bộ.
- **Graceful Failure:** thất bại vẫn dẫn đường hành động tiếp theo.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

#### 1) Google Translate extension

- Điểm mạnh: trigger nhanh theo hành vi quen thuộc (highlight/right-click), phản hồi rõ ngữ cảnh.
- Giá trị học được: giảm thao tác là yếu tố giữ người dùng quay lại.

#### 2) Vocabulary.com word page

- Điểm mạnh: cấu trúc nội dung giàu giá trị học (headword, pronunciation, các lớp nghĩa).
- Giá trị học được: trình bày thông tin theo thứ bậc giúp “scan” nhanh trước, đọc sâu sau.

#### 3) Google Dictionary / Dictionariez

- Điểm mạnh: tra từ tại chỗ, popup nhẹ, giảm đứt mạch đọc.
- Giá trị học được: UX tốt không cần phức tạp, chỉ cần đúng lúc + rõ trạng thái.

### Transferable UX Patterns

- **Highlight-to-lookup tức thì** cho core loop chính.
- **Popup near-selection** để giữ mắt người dùng trong cùng vùng đọc.
- **Information hierarchy 2 tầng**:
  - Tầng 1: headword + pronunciation + định nghĩa ngắn
  - Tầng 2: mở rộng nghĩa/chi tiết khi cần
- **System feedback rõ ràng** với `loading / success / not found / error`.
- **Dismiss/control đơn giản**: click ngoài hoặc phím Esc để đóng nhanh.

### Anti-Patterns to Avoid

- Popup quá lớn che nội dung chính.
- Hiển thị quá nhiều thông tin ngay lần đầu khiến quá tải nhận thức.
- Trigger nhiễu (bôi đen ngắn, double-trigger, popup nháy liên tục).
- Lỗi im lặng (không có thông điệp khi fail/not found).
- Hành vi không nhất quán giữa các website.

### Design Inspiration Strategy

#### What to Adopt

- Pattern highlight-to-popup tốc độ cao.
- Phân cấp nội dung kiểu “scan-first, deep-later”.
- Trạng thái hệ thống rõ ràng và có hướng dẫn hành động.

#### What to Adapt

- Giữ UX quen thuộc như Google Translate nhưng thay bản dịch bằng definition-first learning.
- Tối giản layout popup theo mục tiêu đọc nhanh (không clone nguyên trang từ điển).

#### What to Avoid

- Nhồi feature học nâng cao vào MVP popup.
- Tạo interaction lạ làm tăng learning cost của người dùng.

## Design System Foundation

### 1.1 Design System Choice

**Themeable system** với hướng **Custom tokens + lightweight component primitives** (phù hợp extension popup), thay vì framework UI nặng.

### Rationale for Selection

- Popup extension cần bundle gọn, render nhanh, tránh phụ thuộc lớn.
- Vẫn cần tính nhất quán cao (spacing, typography, states, colors).
- Dễ giữ “look & feel” gần pattern quen thuộc (Google Translate-like) nhưng vẫn có bản sắc riêng.
- Dễ kiểm soát accessibility cơ bản và trạng thái hệ thống (`loading/success/not found/error`).

### Implementation Approach

- Dùng kiến trúc token-first:
  - Color tokens
  - Typography scale
  - Spacing scale
  - Radius/shadow/motion tokens
- Component set MVP:
  - `PopupContainer`
  - `WordHeader`
  - `PronunciationRow`
  - `DefinitionBlock`
  - `StatusState`
  - `ActionRow`
- State contract rõ cho tất cả component theo 4 trạng thái chính.

### Customization Strategy

- Giữ visual language tối giản, ưu tiên readability.
- Cho phép tinh chỉnh density (compact/comfortable) cho popup.
- Cấu hình theme sáng/tối ở phase sau (không bắt buộc MVP).
- Không mở rộng component ngoài core loop trong MVP để tránh scope creep.

## 2. Core User Experience

### 2.1 Defining Experience

Defining experience của sản phẩm là: **“Highlight một từ tiếng Anh và hiểu ngay nghĩa trong popup mà không rời trang.”**
Đây là tương tác cốt lõi quyết định giá trị sản phẩm; nếu tương tác này mượt, phần còn lại trở thành mở rộng tự nhiên.

### 2.2 User Mental Model

- Người dùng kỳ vọng pattern quen thuộc như Google Translate: chọn từ → có kết quả ngay gần vùng chọn.
- Họ mong thao tác tối thiểu, không phải copy/paste hoặc mở tab mới.
- Khi lookup thất bại, họ kỳ vọng hệ thống chỉ rõ vì sao và phải làm gì tiếp theo.

### 2.3 Success Criteria

- Trigger đúng khi selection hợp lệ, không trigger nhiễu.
- Popup xuất hiện nhanh, đúng vị trí, dễ đọc.
- Người dùng hiểu nghĩa cốt lõi trong vài giây.
- Có feedback rõ ở mọi trạng thái (`loading/success/not found/error`).
- Luồng thất bại vẫn giữ được cảm giác kiểm soát (không bối rối).

### 2.4 Novel UX Patterns

- Sản phẩm chủ yếu dùng **established pattern** (highlight-to-popup) để giảm learning cost.
- Điểm mới nằm ở **definition-first learning** và cấu trúc nội dung popup tối ưu cho học sâu thay vì dịch nhanh.
- Đây là “familiar interaction + differentiated content strategy”.

### 2.5 Experience Mechanics

1. **Initiation:** user bôi đen một từ tiếng Anh trên trang web.
2. **Interaction:** extension bắt selection, chuẩn hóa token, gọi lookup.
3. **Feedback:** popup hiển thị loading ngay; sau đó success/not found/error tương ứng.
4. **Completion:** user hiểu nghĩa và tiếp tục đọc; có thể đóng popup nhanh (click ngoài/Esc).
5. **Recovery:** nếu lỗi/không tìm thấy, hệ thống hiển thị dòng link tìm kiếm ngoại (Google, Cambridge, Oxford) ở vị trí ưu tiên và các gợi ý thao tác lại (chọn 1 từ, bỏ dấu câu, thử từ gốc).

## Visual Design Foundation

### Color System

**Theme được chọn:** *Scholarly Calm* (xanh tin cậy + nền sáng trung tính)

- `primary-600`: `#0B5EA8` (CTA chính, link)
- `primary-500`: `#1677C9` (hover/interactive)
- `primary-100`: `#EAF4FF` (surface nhấn nhẹ)
- `text-primary`: `#1F2937` (nội dung chính)
- `text-secondary`: `#4B5563` (mô tả phụ)
- `border`: `#D1D5DB`
- `surface`: `#FFFFFF`
- `surface-muted`: `#F8FAFC`
- `success`: `#0F9D58`
- `warning`: `#F59E0B`
- `error`: `#DC2626`
- `focus-ring`: `#2563EB`

**Semantic mapping:**

- `loading` → primary-500 + skeleton `surface-muted`
- `success` → text-primary + accent `primary-600`
- `not-found` → warning
- `error` → error

### Typography System

- Font chính: **Inter** (fallback: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`)
- Tone: hiện đại, học thuật, dễ đọc nhanh trong popup nhỏ
- Type scale:
  - `word-title`: 40px / 700
  - `section-title`: 22px / 600
  - `body-lg`: 18px / 400
  - `body`: 16px / 400
  - `meta`: 14px / 400
  - `caption`: 12px / 500
- Line-height:
  - Heading: 1.2
  - Body: 1.5
  - Dense meta rows: 1.35

### Spacing & Layout Foundation

- Hệ spacing: **8pt grid** (`4, 8, 12, 16, 24, 32`)
- Popup layout:
  - Max width: `420px` (mặc định ~`380px`)
  - Padding ngoài: `16px`
  - Khoảng cách block: `12–16px`
  - Radius: `12px`
  - Shadow: `0 8px 24px rgba(15, 23, 42, 0.14)`
- Mật độ:
  - Default: comfortable
  - Có thể hạ xuống compact ở phase sau

### Accessibility Considerations

- Mục tiêu tương phản: **WCAG AA** cho text thường và trạng thái lỗi/cảnh báo
- Keyboard:
  - Có thể đóng popup bằng `Esc`
  - Focus ring luôn nhìn thấy (`focus-ring`)
- Nội dung:
  - Tránh màu là tín hiệu duy nhất cho trạng thái
  - Mọi trạng thái đều có nhãn text rõ
- Motion:
  - Animation ngắn (`120–180ms`), giảm hiệu ứng nếu người dùng bật reduced motion

## Detailed UX Refinements

### 1. Skeleton Loading (Addressing Layout Shift)

- **UX Goal:** Tránh giật khung hình (layout shift) gây mất tập trung khi chuyển từ trạng thái `loading` sang `success`.
- **Implementation:**
  - Ngay khi bôi đen từ, popup xuất hiện với khung kích thước tối thiểu cố định (`width: 300px`, `height: 120px`).
  - Thay vì dòng chữ "Đang tra cứu...", hiển thị giao diện **Skeleton UI** (các khối chữ nhật màu xám nhạt `#E5E7EB` đến `#F3F4F6` đại diện cho text).
  - Cấu trúc Skeleton mô phỏng chính xác kết quả thực: 1 khối to cho Headword (rộng 40%), 1 khối nhỏ cho Pronunciation (rộng 25%), 2 khối mỏng cho Definition (90% và 70%).
  - Kèm hiệu ứng *shimmer* lướt sóng từ trái qua phải liên tục để tạo cảm giác hệ thống đang hoạt động tích cực.
  - Khi dữ liệu trả về thực tế, các khối xương (skeleton) này sẽ được thay thế mượt mà (cross-fade hoặc swap ngay lập tức) mà không làm nhảy vị trí popup.

### 3. External Dictionary Fallback (Search Suggestions)

- **UX Goal:** Cung cấp lối thoát ngay lập tức khi từ điển chính không có kết quả, giảm tỷ lệ người dùng phải tự copy-paste sang tab khác.
- **Implementation:**
  - **Placement:** Hiển thị một dòng văn bản đơn giản nằm **ngay phía trên** danh sách gợi ý (`guidance-list`) trong trạng thái `not-found`.
  - **Content:** "Thử tìm kiếm tại: [Google] | [Cambridge] | [Oxford]" (hoặc ngôn ngữ tương đương được cấu hình).
  - **Styling:**
    - Text: `body-sm` (`meta`), màu `text-secondary`.
    - Links: Màu `primary-600` (`#0B5EA8`), có gạch chân (`text-decoration: underline`) khi hover để nhận diện khả năng tương tác.
    - Spacing: Cách lề dưới 8px để tách biệt với danh sách mẹo tra cứu.
  - **Safety:** Tất cả các link phải mở trong tab mới (`target="_blank"`) và có thuộc tính `rel="noopener noreferrer"`.
