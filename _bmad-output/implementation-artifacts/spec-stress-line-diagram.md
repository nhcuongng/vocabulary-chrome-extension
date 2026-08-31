---
title: 'Biểu thị sơ đồ trọng âm tiếng Anh theo dạng Line Diagram / Line Notation'
type: 'feature'
created: '2026-08-31'
status: 'done'
baseline_commit: '3ac9d34b750fb4cbc1c33aaa4a1fde538d57ca15'
context: ['_bmad-output/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hiện tại tiện ích hiển thị chuỗi phiên âm IPA thuần túy dạng văn bản (text), gây khó khăn cho người học tiếng Anh trong việc hình dung trực quan cao độ và nhịp điệu trọng âm (stress contour & syllable hierarchy) của từ vựng nhiều âm tiết.

**Approach:** Xây dựng module phân tích âm tiết & trọng âm từ chuỗi IPA (`src/domain/stressDiagramUtils.js`) để tạo sơ đồ trọng âm dạng đường nét bậc thang (Stepped Line Diagram: High `▔` cho Trọng âm chính, Mid `⎺` cho Trọng âm phụ, Low `_` cho Âm không nhấn) kèm từng âm tiết bên dưới, đồng thời tích hợp dòng Call-to-Action (CTA) ngay dưới cụm phát âm để người dùng có thể linh hoạt bấm mở/ẩn sơ đồ trên cả Extension Popup và In-page Shadow DOM Popup.

## Boundaries & Constraints

**Always:**
- Tự động trích xuất và phân tích chính xác các dấu trọng âm chuẩn IPA: trọng âm chính (`ˈ`), trọng âm phụ (`ˌ`) và dấu ngắt âm tiết (`.`).
- Giao diện sơ đồ bậc thang (Line Diagram) phải đồng bộ thiết kế, hiển thị mượt mà trên cả giao diện sáng (Light Mode) và tối (Dark Mode).
- Giữ nguyên luồng phát âm audio và hiển thị IPA hiện tại mà không làm phá vỡ cấu trúc view model hay layout gốc.
- Đảm bảo an toàn khi chuỗi IPA rỗng, không có dấu trọng âm (từ 1 âm tiết) hoặc định dạng không chuẩn: fallback tự động mà không gây throw lỗi runtime.

**Ask First:**
- Mở rộng thuật toán phân tách âm tiết ngoài phạm vi các quy tắc IPA chuẩn hiện có.

**Never:**
- Không xóa bỏ thông tin phiên âm IPA văn bản hoặc nút nghe audio đã có.
- Không inject các thư viện bên ngoài nặng nề; sử dụng SVG/CSS thuần túy để tối ưu hiệu năng.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Từ đa âm tiết có trọng âm chính | IPA `/ˈfoʊ.t̬ə.ɡræf/` (photograph) | 3 âm tiết: `foʊ` (High `▔`), `t̬ə` (Low `_`), `ɡræf` (Low `_`). Line notation: `▔ _ _`. Sơ đồ bậc thang 3 nấc. | N/A |
| Từ có cả trọng âm chính và phụ | IPA `/ˌfoʊ.t̬əˈɡræf.ɪk/` (photographic) | 4 âm tiết: `foʊ` (Mid `⎺`), `t̬ə` (Low `_`), `ɡræf` (High `▔`), `ɪk` (Low `_`). Line notation: `⎺ _ ▔ _`. | N/A |
| Từ 1 âm tiết | IPA `/kæt/` hoặc `/ˈkæt/` | 1 âm tiết `kæt` (High `▔`). Line notation: `▔`. | N/A |
| Chuỗi IPA rỗng hoặc không xác định | `pronunciation: ""` hoặc `null` | Không render khối CTA / Sơ đồ trọng âm. | Ẩn an toàn, không lỗi. |
| Người dùng click CTA toggle sơ đồ | Click vào dòng nút `📈 Trọng âm: ▔ _ _ [Xem sơ đồ]` | Bật/tắt hiển thị khung sơ đồ bậc thang chi tiết ngay bên dưới pronunciation. | Giữ trạng thái đóng/mở mượt mà. |

</frozen-after-approval>

## Code Map

- `src/domain/stressDiagramUtils.js` -- Module trích xuất âm tiết, xác định bậc trọng âm (High/Mid/Low) từ chuỗi IPA và tạo dữ liệu/markup sơ đồ Line Diagram.
- `src/application/popupViewModelMapper.js` -- Bổ sung trường `stressPattern` vào View Model của Popup khi có dữ liệu phiên âm.
- `src/content/popupRenderer.js` -- Bổ sung `stress-diagram` item vào danh sách các phần tử render của trạng thái tra từ thành công (`renderSuccessContent`).
- `src/popup/popup.html` & `src/popup/popup.js` -- Bổ sung CSS và render component sơ đồ trọng âm + nút toggle trong Extension Toolbar Popup.
- `src/content/popupManager.js` -- Bổ sung CSS Shadow DOM và render component sơ đồ trọng âm + nút toggle trong In-page Popup.
- `tests/domain/stressDiagramUtils.test.js` -- Unit tests kiểm tra thuật toán phân tích trọng âm và dựng sơ đồ từ nhiều định dạng IPA.
- `tests/content/popupManagerNavigation.test.js` & `tests/application/popupViewModelMapper.test.js` -- Unit tests tích hợp kiểm tra render và tương tác toggle.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/stressDiagramUtils.js` -- Viết hàm `parseStressDiagramFromIpa(ipa)` và `renderStressLineDiagramHtml(stressData)` phân tích âm tiết và bậc trọng âm.
- [x] `tests/domain/stressDiagramUtils.test.js` -- Viết bộ unit tests bao phủ các mẫu từ 1 âm tiết, nhiều âm tiết, có trọng âm phụ, từ bất quy tắc và trường hợp chuỗi rỗng/lỗi.
- [x] `src/application/popupViewModelMapper.js` -- Gắn thông tin `stressDiagram` vào `popupViewModel`.
- [x] `src/content/popupRenderer.js` -- Tích hợp `stress-diagram` vào quy trình render popup.
- [x] `src/popup/popup.html` & `src/popup/popup.js` -- Bổ sung styling CSS và logic toggle hiển thị sơ đồ trọng âm trong Extension Popup.
- [x] `src/content/popupManager.js` -- Bổ sung styling CSS Shadow DOM và logic toggle hiển thị sơ đồ trọng âm trong In-page Content Script Popup.
- [x] `tests/content/popupManagerNavigation.test.js` -- Viết test case kiểm tra hiển thị CTA sơ đồ trọng âm và click toggle sơ đồ thành công.

**Acceptance Criteria:**
- Given một từ vựng có phiên âm IPA (ví dụ `/ˈfoʊ.t̬ə.ɡræf/`), when hiển thị popup kết quả tra từ, then xuất hiện dòng CTA hiển thị ký hiệu vạch trọng âm `Trọng âm: ▔ _ _` kèm nút mở sơ đồ.
- Given người dùng click vào dòng CTA mở sơ đồ, when sơ đồ được kích hoạt, then hiển thị sơ đồ bậc thang (Stepped Line Diagram) biểu diễn trực quan các mức cao độ của từng âm tiết.
- Given một từ đơn âm tiết hoặc từ không có dấu chấm phân tách, when phân tích, then hệ thống vẫn nhận diện an toàn và không gây crash UI.

## Design Notes

- **Quy ước mức cao độ (Pitch Levels):**
  - Bậc 2 (High - `▔`): Âm tiết mang trọng âm chính (bắt đầu bằng `ˈ`).
  - Bậc 1 (Mid - `⎺`): Âm tiết mang trọng âm phụ (bắt đầu bằng `ˌ`).
  - Bậc 0 (Low - `_`): Âm tiết không mang trọng âm (unstressed syllable).
- **Stepped Line Visualization:**
  - Sử dụng SVG hoặc các thẻ flex bar có chiều cao/vị trí tương ứng kết hợp đường kẻ nối giữa các bậc để tạo cảm giác đồ thị cao độ nhịp điệu giọng nói (intonation/stress contour).

## Verification

**Commands:**
- `npm test` -- expected: Toàn bộ test suites chạy pass 100%.
- `npm run build` -- expected: Build bundle thành công không lỗi.

**Manual checks (if no CLI):**
- Mở popup tra từ `photograph`, `photography`, `photographic`, `information` kiểm tra sơ đồ trọng âm hiển thị chính xác các nấc bậc thang tương ứng và nút toggle hoạt động mượt mà.

## Suggested Review Order

**Core Phonetics & Syllable Stress Parsing**

- Phân tích âm tiết, gán 3 bậc cao độ (High/Mid/Low) và sinh SVG Stepped Line Diagram
  [`stressDiagramUtils.js:1`](../../src/domain/stressDiagramUtils.js#L1)

**Application Mapping & Content Rendering Pipeline**

- Gắn `stressDiagram` vào View Model popup khi có thông tin phiên âm
  [`popupViewModelMapper.js:59`](../../src/application/popupViewModelMapper.js#L59)

- Đưa item `stress-diagram` vào danh sách render kết quả thành công
  [`popupRenderer.js:39`](../../src/content/popupRenderer.js#L39)

**UI & Interactive Toggle Components**

- Component CTA dòng trọng âm kèm toggle sơ đồ trên Extension Toolbar Popup
  [`popup.js:586`](../../src/popup/popup.js#L586)

- Component CTA dòng trọng âm kèm toggle sơ đồ trong In-page Shadow DOM Popup
  [`popupManager.js:1565`](../../src/content/popupManager.js#L1565)

- CSS định kiểu Light Mode & Dark Mode cho sơ đồ trọng âm
  [`popup.html:542`](../../src/popup/popup.html#L542)

**Test Suites & Quality Gate**

- Unit tests cho module phân tích âm tiết và SVG generator
  [`stressDiagramUtils.test.js:1`](../../tests/domain/stressDiagramUtils.test.js#L1)

- Tests tích hợp render và click toggle CTA trong Popup Manager
  [`popupManagerNavigation.test.js:420`](../../tests/content/popupManagerNavigation.test.js#L420)

