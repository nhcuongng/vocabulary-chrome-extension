---
epic: epic-6
id: 6-3
status: backlog
title: Kiểm thử tích hợp và bảo mật cho link ngoại
---

### Story Description
As a QA engineer, I want đảm bảo các link ngoại hoạt động đúng và an toàn, so that không gây rủi ro bảo mật hoặc làm người dùng rời khỏi trang hiện tại.

### Technical Context
- **Compliance:** Ensure all generated URLs use HTTPS.
- **Security:** Ensure `noopener noreferrer` is present on all external links.

### Acceptance Criteria
1. All 69 existing tests pass after the changes.
2. New test cases in `tests/application/popupViewModelMapper.test.js` verify that search links are correctly generated for `not-found` results.
3. New test cases verify that the `token` is correctly encoded in the search links.
4. Verify that the rendered HTML in the popup contains the expected `target="_blank"` and `rel` attributes.

### Files to Modify
- `tests/application/popupViewModelMapper.test.js`
- `tests/content/popupRenderer.test.js`
