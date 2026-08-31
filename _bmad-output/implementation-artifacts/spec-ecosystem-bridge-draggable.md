---
title: 'Ecosystem Bridge Target Positioning and Draggable Popup Modal'
type: 'feature'
created: '2026-08-31'
status: 'done'
baseline_commit: '6048d499d199c4419b5c5ee74b019a38a8bf126e'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Khi các extension hoặc ứng dụng trong ecosystem kích hoạt tra từ qua sự kiện `vocabulary-lookup`, modal tra cứu không neo chính xác theo vị trí của target element/tọa độ click, đồng thời người dùng không thể kéo thả (drag & drop) modal popup để di chuyển đến vị trí thuận tiện khi đọc tài liệu.

**Approach:** Bổ sung khả năng nhận diện vị trí đa dạng từ event detail (`target`, `targetElement`, `rect`, `clientX/Y`, `x/y`) trong Ecosystem Bridge và lưu chuyển tọa độ qua Orchestrator; đồng thời tích hợp tính năng kéo thả (draggable) trên Header Bar của popup modal với giới hạn biên màn hình (viewport boundary guard) và duy trì vị trí đã kéo.

## Boundaries & Constraints

**Always:**
- Giữ nguyên Shadow DOM Isolation và tagged union response contract.
- Các tương tác kéo thả trên header bar không được kích hoạt khi người dùng click vào các phần tử tương tác (chips từ vựng, nút prev/next, nút nguồn từ điển, nút close, input search).
- Vị trí kéo thả phải luôn được giới hạn trong khung nhìn màn hình (viewport), không để modal bị trượt ra ngoài vùng hiển thị.
- Đảm bảo các sự kiện kéo thả (pointerdown/mousedown, pointermove/mousemove, pointerup/mouseup) không làm rò rỉ listener ra window sau khi đóng modal hoặc nhả chuột.

**Ask First:**
- Thay đổi cấu trúc DOM cốt lõi ngoài Shadow DOM hoặc sửa đổi contract của Ecosystem Bridge CustomEvent.

**Never:**
- Không sử dụng thư viện bên ngoài cho tính năng Drag & Drop (sử dụng native DOM pointer/mouse events).
- Không tự động commit hoặc push code lên Git.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Ecosystem Bridge với target element | Event detail chứa `target` hoặc `targetElement` có `getBoundingClientRect()` | Modal hiển thị ngay dưới target element theo đúng tọa độ scroll | Fallback về giữa màn hình nếu `getBoundingClientRect()` trả về 0 hoặc null |
| Ecosystem Bridge với tọa độ x, y / clientX, clientY | Event detail chứa `{ x: 150, y: 200 }` hoặc `{ clientX, clientY }` | Modal neo vị trí xuất phát từ điểm tọa độ truyền vào | Fallback an toàn nếu tọa độ nằm ngoài viewport |
| Ecosystem Bridge với explicit rect | Event detail chứa `rect: { left, top, right, bottom, width, height }` | Modal sử dụng trực tiếp rect để tính toán vị trí hiển thị | Fallback về viewport default nếu rect không hợp lệ |
| Kéo thả modal popup | User bấm giữ chuột trên Header Bar (vùng trống) và di chuyển chuột | Modal popup di chuyển theo con trỏ chuột mượt mà (`cursor: grabbing`) và dừng lại tại vị trí thả chuột | Giữ modal trong biên viewport (scrollX/scrollY constraints) |
| Click tương tác trên Header Bar | User bấm nút Close, nút Source Switcher, chip từ vựng, hoặc Search input | Thực hiện hành động tương ứng của nút bấm, không kích hoạt drag | `stopPropagation` / exclude selector |

</frozen-after-approval>

## Code Map

- `src/content/runtimeContentScript.js` -- Trích xuất vị trí target từ `vocabulary-lookup` event detail (`target`, `targetElement`, `rect`, `clientX/Y`, `x/y`) và lưu chuyển vị trí qua orchestrator / popupManager.
- `src/content/lookupFlowOrchestrator.js` -- Bảo toàn `selectionRect` trong các trạng thái `state` (`loading`, `success`, `not-found`, `error`) để `onStateChange` luôn có đủ context vị trí.
- `src/content/popupManager.js` -- Thêm logic xử lý kéo thả (drag & drop) trên header bar, cập nhật styling (`cursor: grab/grabbing`), quản lý trạng thái tọa độ thủ công khi đã drag và giới hạn biên viewport.
- `tests/content/ecosystemBridge.test.js` -- Bổ sung test kiểm thử trích xuất vị trí target từ event detail.
- `tests/content/popupManagerNavigation.test.js` -- Bổ sung test kiểm thử tính năng kéo thả popup modal và giới hạn biên.

## Tasks & Acceptance

**Execution:**
- [x] `src/content/lookupFlowOrchestrator.js` -- Giữ lại `selectionRect` trong payload khi chuyển trạng thái (loading, success, not-found, error).
- [x] `src/content/runtimeContentScript.js` -- Cải tiến `handleEcosystemLookupEvent` để phát hiện và chuyển đổi tọa độ từ mọi biến thể (`target`, `targetElement`, `rect`, `clientX/Y`, `x/y`), đảm bảo `onStateChange` ưu tiên dùng `state.selectionRect`.
- [x] `src/content/popupManager.js` -- Tích hợp cơ chế Drag & Drop cho Popup Container qua Header Bar, hỗ trợ custom dragged position và viewport clamping.
- [x] `tests/content/ecosystemBridge.test.js` -- Viết unit test cho việc nhận diện target element và tọa độ từ Ecosystem Bridge.
- [x] `tests/content/popupManagerNavigation.test.js` -- Viết unit test cho tính năng kéo thả popup modal.

**Acceptance Criteria:**
- Given sự kiện `vocabulary-lookup` với `targetElement` hoặc tọa độ click, when sự kiện được dispatch, then popup hiển thị tại vị trí tương ứng của target đó.
- Given popup modal đang mở, when người dùng nhấn giữ chuột trên vùng trống của header bar và kéo, then popup di chuyển theo chuột và cố định tại vị trí mới khi thả chuột.
- Given popup modal đã được kéo thả, when cuộn trang hoặc chuyển từ, then vị trí không bị giật lỗi và không vượt ra ngoài biên màn hình.

## Verification

**Commands:**
- `npm test` -- expected: Tất cả test suites (bao gồm ecosystem bridge và popup drag tests) đều pass 100%.
- `npm run build` -- expected: Build bundle hoàn tất không có lỗi.

## Suggested Review Order

**Ecosystem Bridge Target Positioning**

- Extract bounding rect from targetElement, target, rect, or click coordinates
  [`runtimeContentScript.js:217`](../../src/content/runtimeContentScript.js#L217)

- Flow selectionRect through loading and completed lookup states
  [`lookupFlowOrchestrator.js:39`](../../src/content/lookupFlowOrchestrator.js#L39)

- Pass target rect into popupManager.showPopup on state changes
  [`runtimeContentScript.js:158`](../../src/content/runtimeContentScript.js#L158)

**Popup Modal Drag & Drop**

- Header bar dragging interaction logic and viewport clamping
  [`popupManager.js:1127`](../../src/content/popupManager.js#L1127)

- Preserve custom dragged coordinates across rerenders and scroll/resize
  [`popupManager.js:1103`](../../src/content/popupManager.js#L1103)

- Grab/grabbing styling and exclusion of interactive buttons from drag
  [`popupManager.js:218`](../../src/content/popupManager.js#L218)

**Automated Tests & Quality Gates**

- Multi-variant target positioning tests for Ecosystem Bridge
  [`ecosystemBridge.test.js:202`](../../tests/content/ecosystemBridge.test.js#L202)

- Drag and drop simulation and interactive button isolation tests
  [`popupManagerNavigation.test.js:474`](../../tests/content/popupManagerNavigation.test.js#L474)

