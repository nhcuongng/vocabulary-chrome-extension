# Story 1.4: Parse dữ liệu cốt lõi và ánh xạ sang model hiển thị

Status: done

## Story

As a người học tiếng Anh,
I want dữ liệu từ dictionary được parse thành cấu trúc thống nhất,
so that popup có thể hiển thị thông tin rõ ràng và nhất quán.

## Acceptance Criteria

1. Given HTML response hợp lệ từ nguồn dictionary, When parser adapter thực thi, Then hệ thống trích xuất được headword, pronunciation và định nghĩa chính, And dữ liệu được ánh xạ về model hiển thị chuẩn.
2. Given parser trả dữ liệu thành công, When popup nhận model hiển thị, Then popup hiển thị trạng thái success, And hiển thị đúng thứ bậc thông tin: headword, pronunciation, nghĩa chính.

## Tasks / Subtasks

- [x] Thiết kế parser adapter tách riêng theo pattern có thể thay thế (AC: 1)
- [x] Xây mapper từ parsed payload -> popup view model chuẩn (AC: 1)
- [x] Kích hoạt success state render theo thứ tự thông tin bắt buộc (AC: 2)
- [x] Viết test parser fixtures + mapper contract test (AC: 1,2)

## Dev Notes

- Ưu tiên adapter pattern để chịu thay đổi cấu trúc nguồn.
- Với parser fail, không throw vỡ pipeline UI; để Epic 2 xử lý error branch.

### Project Structure Notes

- Parser implementation nằm trong infrastructure/adapters.
- View model mapping nằm trong application/service layer.

### References

- Source: _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.4)
- Source: _bmad-output/planning-artifacts/architecture.md (AR1, AR7)
- Source: _bmad-output/planning-artifacts/prd.md (FR13, FR16, FR20)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (19/19 tests pass)

### Completion Notes List

- Story context created by Scrum Master.
- Implemented parser adapter tách biệt (`vocabularyHtmlParserAdapter`) để extract headword, pronunciation, định nghĩa chính theo pattern có thể thay thế.
- Implemented mapper `mapParsedPayloadToPopupViewModel()` chuyển payload parse về model hiển thị success thống nhất.
- Added popup success renderer để đảm bảo thứ bậc thông tin bắt buộc: headword -> pronunciation -> definition.
- Added parser fixture test, mapper contract test, và success-render-order test để khóa behavior theo AC.
- Code review hoàn tất, không còn issue blocker cho parser/mapping flow.

### File List

- _bmad-output/implementation-artifacts/1-4-parse-du-lieu-cot-loi-va-anh-xa-sang-model-hien-thi.md
- src/infrastructure/adapters/vocabularyHtmlParserAdapter.js
- src/application/popupViewModelMapper.js
- src/content/popupRenderer.js
- tests/infrastructure/vocabularyHtmlParserAdapter.test.js
- tests/application/popupViewModelMapper.test.js
- tests/content/popupRenderer.test.js
