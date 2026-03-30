---
epic: epic-6
id: 6-1
status: backlog
title: Tạo link tìm kiếm từ điển ngoại trong ViewModelMapper
---

### Story Description
As a developer, I want logic sinh URL tìm kiếm ngoại được đặt tại Mapper, so that background service luôn tinh gọn và dễ dàng thay đổi nguồn link sau này.

### Technical Context
- **Decision 6 (Architecture):** Dynamic URL Generation in the `ViewModelMapper` layer.
- **Decision 7 (Architecture):** Expand `LookupResponse` tagged union for `not-found` state to include the `token`.

### Acceptance Criteria
1. `src/application/popupViewModelMapper.js` handles status `not-found` by generating a search suggestions string.
2. URLs generated for:
   - Google: `https://www.google.com/search?q=define+${word}`
   - Cambridge: `https://dictionary.cambridge.org/dictionary/english/${word}`
   - Oxford: `https://www.oxfordlearnersdictionaries.com/definition/english/${word}`
3. All URLs are properly URI-encoded using `encodeURIComponent`.
4. Links must include `target="_blank"` and `rel="noopener noreferrer"`.
5. The `not-found` response in `src/shared/lookupContract.js` is updated to include the `token`.

### Files to Modify
- `src/shared/lookupContract.js`
- `src/application/popupCopyCatalog.js`
- `src/application/popupViewModelMapper.js`
