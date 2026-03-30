---
epic: epic-6
id: 6-2
status: backlog
title: Cập nhật giao diện Popup cho trạng thái Not Found
---

### Story Description
As a người học tiếng Anh, I want thấy các link tìm kiếm ngoại ngay trên popup khi không tìm thấy từ, so that tôi có thể tra cứu ở nguồn khác chỉ với 1 cú click.

### Technical Context
- **UX Spec (Section 3):** External Dictionary Fallback (Search Suggestions) spec.
- **Placement:** Top of the current suggestion list.

### Acceptance Criteria
1. `src/content/popupRenderer.js`'s `renderNotFoundContent` is updated to handle the new `searchSuggestions` field from the ViewModel.
2. The search suggestions text must appear ABOVE the `guidance-list`.
3. Styling: Text uses `text-secondary`, links use `primary-600` (#0B5EA8) with underline on hover.
4. Spacing: 8px margin below the search suggestions row.

### Files to Modify
- `src/content/popupRenderer.js`
- `src/content/popupManager.js` (CSS styles)
