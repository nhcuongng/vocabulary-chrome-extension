---
title: 'Tối ưu Lịch sử Tìm kiếm: Slide 5 từ, Bỏ nút Back/Forward, Không đẩy đầu khi chọn, Tìm kiếm Lịch sử'
type: 'feature'
created: '2026-08-29'
status: 'done'
baseline_commit: '5bcff3833af9fefd35b6287f483b74c8da4326b0'
context: ['_bmad-output/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Giao diện lịch sử hiện tại có nút Back/Forward chiếm diện tích, thanh cuộn lịch sử chưa phân trang cố định 5 từ/slide, việc click vào từ lịch sử bị đẩy lên đầu làm xáo trộn vị trí, và thiếu công cụ tìm kiếm nhanh lại từ đã tra.

**Approach:** Bỏ các nút Back/Forward, chuyển thanh lịch sử thành slide phân trang 5 từ/trang có nút lướt slide `‹` `›`, giữ nguyên vị trí từ trong lịch sử khi click xem lại, và thêm nút icon Search để mở ô lọc từ khóa lịch sử trực tiếp trên header.

## Boundaries & Constraints

**Always:**
- Giữ nguyên Shadow DOM style isolation trong `popupManager.js` và tagged union response contract `{ status, data, error }`.
- Tất cả sự kiện click/input trong header bar phải gọi `e?.stopPropagation?.()` để tránh làm đóng popup của trang web chủ.
- Mỗi slide hiển thị tối đa đúng 5 từ.
- Khi click từ trong lịch sử, chỉ thực hiện tra cứu nghĩa từ, KHÔNG gọi `historyStore.addSearchWord` làm đẩy từ lên đầu.

**Ask First:**
- Thay đổi cấu trúc lưu trữ `vocab_search_history` trong `chrome.storage.local`.

**Never:**
- Không xóa hay làm mất lịch sử tra cứu của người dùng.
- Không gửi bất kỳ dữ liệu tìm kiếm lịch sử nào ra máy chủ bên ngoài.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hiển thị Slide mặc định | Lịch sử có 12 từ, trang 0 | Hiển thị 5 từ đầu (1-5), nút `‹` disabled, nút `›` enabled | N/A |
| Chuyển Slide tiếp theo | Click nút `›` | Hiển thị 5 từ tiếp theo (6-10), nút `‹` enabled, nút `›` enabled | N/A |
| Chuyển đến Slide cuối | Click nút `›` lần 2 | Hiển thị 2 từ còn lại (11-12), nút `‹` enabled, nút `›` disabled | N/A |
| Click từ trong lịch sử | Click từ "create" ở vị trí thứ 7 | Tra cứu từ "create", từ "create" vẫn ở vị trí thứ 7 trong danh sách | N/A |
| Mở ô Search lịch sử | Click icon Search 🔍 trên header | Slide chuyển sang ô input gõ tìm kiếm lịch sử | N/A |
| Lọc từ trong lịch sử | Gõ "co" vào ô search lịch sử | Hiển thị các từ trong lịch sử chứa/bắt đầu bằng "co", chia thành slide 5 từ | N/A |
| Lịch sử rỗng | `vocab_search_history` = [] | Thanh slide ẩn hoặc hiển thị trống, icon search ẩn hoặc disabled | N/A |

</frozen-after-approval>

## Code Map

- `src/content/popupManager.js` -- Quản lý header bar: render slide phân trang 5 từ, nút chuyển slide `‹` `›`, icon search, ô input tìm kiếm lịch sử và xử lý không đẩy đầu khi click từ lịch sử.
- `src/content/runtimeContentScript.js` -- Tách biệt luồng tra cứu từ mới (thêm vào lịch sử) và luồng tra cứu từ lịch sử (không thêm vào lịch sử).
- `tests/content/popupManagerNavigation.test.js` -- Unit tests kiểm tra phân trang slide 5 từ, nút chuyển slide, search lịch sử, và bảo toàn thứ tự từ.

## Tasks & Acceptance

**Execution:**
- [x] `src/content/popupManager.js` -- Bỏ nút Back/Forward, thêm phân trang slide 5 từ kèm nút `‹` `›`, thêm icon search & ô input filter lịch sử, cập nhật callback tra cứu không đẩy đầu.
- [x] `src/content/runtimeContentScript.js` -- Cập nhật handler tra cứu từ popup phân biệt rõ nguồn kích hoạt để không push lại vào đầu lịch sử khi bấm từ thanh history.
- [x] `tests/content/popupManagerNavigation.test.js` -- Cập nhật và bổ sung test cases cho slide 5 từ, nút prev/next slide, tìm kiếm lịch sử.

**Acceptance Criteria:**
- Given popup hiển thị danh sách 15 từ lịch sử, when xem header bar, then hiển thị 5 từ đầu tiên và có nút chuyển slide `›`.
- Given người dùng bấm nút `›`, when slide chuyển trang, then hiển thị 5 từ tiếp theo (từ 6 đến 10).
- Given người dùng click vào từ bất kỳ trên thanh slide lịch sử, when tra cứu hoàn tất, then thứ tự các từ trong lịch sử không bị thay đổi.
- Given người dùng bấm icon Search 🔍 trên header, when gõ từ khóa, then thanh slide hiển thị danh sách từ lịch sử khớp với từ khóa theo slide 5 từ.

## Verification

**Commands:**
- `npm test` -- expected: Tất cả 94 test cases đều PASS.
- `npm run build` -- expected: Build bundle thành công không lỗi.
- `npm run quality:gate` -- expected: Toàn bộ release quality gate PASS.

## Suggested Review Order

**Header Bar & History Slide Interaction**

- Giao diện header bar với phân trang 5 từ/slide, nút chuyển slide `‹` `›` và thanh tìm kiếm lịch sử inline:
  [`popupManager.js:570`](../../src/content/popupManager.js#L570)

- Điều hướng tra cứu bảo toàn vị trí, truyền `{ fromHistory: true }` khi click từ lịch sử:
  [`popupManager.js:520`](../../src/content/popupManager.js#L520)

**Runtime Coordination**

- Bỏ qua việc push lại vào đầu lịch sử khi nhận flag `fromHistory: true`:
  [`runtimeContentScript.js:51`](../../src/content/runtimeContentScript.js#L51)

**Automated Tests**

- Kiểm thử phân trang slide 5 từ, nút next/prev, và tìm kiếm lọc từ khóa lịch sử:
  [`popupManagerNavigation.test.js:180`](../../tests/content/popupManagerNavigation.test.js#L180)
