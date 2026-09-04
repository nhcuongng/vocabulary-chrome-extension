---
title: 'Hạn chế Layout Shift (CLS) khi Loading trong Popup & Overlay'
type: 'refactor'
created: '2026-09-04'
status: 'done'
baseline_commit: 'e347e6ce28391aaa6b2a1ed02bcf635447a1a62a'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khi popup hoặc quick search overlay hiển thị trạng thái loading (skeleton), kích thước và cấu trúc của skeleton chênh lệch nhiều so với nội dung kết quả thực tế, gây ra hiện tượng giật cục, nhảy vị trí popup (layout shift / CLS) khi dữ liệu tra cứu trả về.

**Approach:** Chuẩn hóa cấu trúc skeleton trong popupManager, quickSearchOverlay và popup.js để mô phỏng chính xác cấu trúc kết quả thật (header, pronunciation, definitions, tags) kết hợp với min-height và transition mượt mà, đồng thời ổn định điểm neo định vị khi popup ở vị trí `above`.

## Boundaries & Constraints

**Always:**
- UI strings 100% bằng tiếng Anh (English UI Only).
- Đảm bảo shadow DOM style isolation không bị ảnh hưởng.
- Giữ vững toàn bộ test suite (187+ tests).

**Ask First:**
- Thay đổi lớn về kích thước mặc định (`width`, `min-height`) của popup nếu vượt quá dải responsive hiện tại.

**Never:**
- Không xóa bỏ skeleton loader để thay bằng spinner toàn màn hình (gây trải nghiệm giật hơn).
- Không phá vỡ tagged union response contract.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Popup Loading State | `state.status === 'loading'` | Hiển thị skeleton gồm Headword, Pronunciation pill, Definition cards với chiều cao tương đương kết quả mẫu; container giữ min-height ổn định. | N/A |
| Popup Data Arrival | `loading` -> `success` | Smooth transition/cross-fade, container không bị nhảy giật vị trí đột ngột. | N/A |
| Popup Placed 'above' | `currentPlacement === 'above'` | Popup mở rộng hướng lên trên mà không làm đáy popup nhảy đè vào vùng text được chọn. | Fallback về clamp trong viewport |
| Quick Search Overlay Loading | Overlay query loading | Results area hiển thị skeleton cấu trúc ổn định, không co giật height. | N/A |

</frozen-after-approval>

## Code Map

- `src/content/popupManager.js` -- Quản lý skeleton styles, responsive min-height và render loading state trong content script popup.
- `src/content/quickSearchOverlay.js` -- Quản lý skeleton loading trong quick search modal overlay.
- `src/popup/popup.js` & `src/popup/popup.html` -- Skeleton loading và CSS trong extension browser popup.
- `tests/content/popupManager.test.js` -- Unit tests kiểm tra skeleton rendering và kích thước popup.

## Tasks & Acceptance

**Execution:**
- [x] `src/content/popupManager.js` -- Bổ sung cấu trúc skeleton chi tiết (headword bar, pron row, 2-3 def blocks), đặt min-height và CSS transition cho bodyContainer để loại bỏ layout shift.
- [x] `src/content/quickSearchOverlay.js` -- Cập nhật skeleton blocks và container min-height tương ứng.
- [x] `src/popup/popup.js` & `src/popup/popup.html` -- Cập nhật skeleton blocks và CSS trong popup standalone.
- [x] `tests/content/popupManagerNavigation.test.js` -- Thêm test assertions cho loading skeleton structure và min-height.

**Acceptance Criteria:**
- Given trạng thái popup là `loading`, when hiển thị, then skeleton có cấu trúc và chiều cao tương đồng với kết quả tra cứu thật, không bị co rút quá nhỏ.
- Given popup đang ở trạng thái `loading`, when dữ liệu `success` hoặc `not-found` trả về, then nội dung chuyển đổi mượt mà mà không làm giật vị trí popup.
- Given chạy `npm test`, when chạy toàn bộ test suite, then tất cả tests đều pass 100%.

## Verification

**Commands:**
- `npm test` -- expected: Tất cả test pass (0 failed).
- `npm run build` -- expected: Build hoàn tất thành công.

## Suggested Review Order

**Skeleton Structure & CSS Styling**

- Cập nhật skeleton blocks và realistic definitions card structure trong popup manager
  [`popupManager.js:225`](../../src/content/popupManager.js#L225)
  [`popupManager.js:2065`](../../src/content/popupManager.js#L2065)

- Đồng bộ skeleton structure trong Quick Search Overlay
  [`quickSearchOverlay.js:70`](../../src/content/quickSearchOverlay.js#L70)
  [`quickSearchOverlay.js:465`](../../src/content/quickSearchOverlay.js#L465)

- Đồng bộ skeleton structure trong extension popup
  [`popup.html:104`](../../src/popup/popup.html#L104)
  [`popup.js:630`](../../src/popup/popup.js#L630)

**Verification & Tests**

- Kiểm thử tự động cấu trúc skeleton đa tầng ngăn ngừa layout shift
  [`popupManagerNavigation.test.js:1178`](../../tests/content/popupManagerNavigation.test.js#L1178)

