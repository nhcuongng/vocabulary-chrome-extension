# Story 5.1: Thiết lập baseline runtime Manifest V3 và script build/dev

Status: done

## Story

As a developer,
I want dự án có manifest và script runtime/build tối thiểu,
so that tôi có thể chạy, đóng gói và kiểm chứng extension trên môi trường thật.

## Acceptance Criteria

1. Given dự án hiện chỉ có test runner, When hoàn tất cấu hình baseline, Then dự án có `manifest.json` hợp lệ cho MV3, And có script `dev` và `build` để chạy luồng phát triển/phát hành.
2. Given cần tích hợp các module đã có, When wiring entry points hoàn tất, Then content/background/popup shell có thể được nạp theo manifest, And không phá vỡ test suite hiện tại.

## Tasks / Subtasks

- [x] Xây baseline MV3 manifest và runtime shell tối thiểu (AC: 1, 2)
  - [x] Thêm `manifest.json` (MV3) với các trường bắt buộc: `manifest_version`, `name`, `version`, `description`, `action`, `background.service_worker`, `content_scripts`, `permissions`, `host_permissions`.
  - [x] Đồng bộ bộ quyền ban đầu với disclosure hiện có: `activeTab`, `scripting`, `storage`, `https://www.vocabulary.com/*` (không mở rộng thêm quyền ngoài phạm vi MVP).
  - [x] Tạo shell entry files để nối runtime với module hiện hữu (không rewrite business logic đã có).

- [x] Thiết lập script dev/build nhất quán trong `package.json` (AC: 1)
  - [x] Giữ nguyên `npm test` hiện tại, thêm script `dev` và `build` theo baseline tooling được chọn cho repo.
  - [x] Đảm bảo output build có thể load được trong Chrome Extension (MV3) cho smoke test thủ công.

- [x] Wiring tối thiểu cho content/background/popup mà không gây regression (AC: 2)
  - [x] Kết nối content entry với luồng hiện tại: selection detection → lookup orchestration → popup rendering.
  - [x] Kết nối service worker entry với lookup handler hiện có và contract tagged-union.
  - [x] Tạo popup shell tối thiểu để hiển thị trạng thái sẵn sàng + disclosure cần thiết (không mở rộng scope UX).

- [x] Bổ sung kiểm chứng kỹ thuật cho baseline runtime (AC: 1, 2)
  - [x] Thêm test kiểm tra tính hợp lệ tối thiểu của manifest/runtime wiring (ít nhất 1 test ở `tests/infrastructure/`).
  - [x] Chạy full test suite và xác nhận toàn bộ test cũ vẫn pass.

## Dev Notes

### Mục tiêu kỹ thuật của story

- Story này là **Milestone 1** trong migration plan: đưa dự án từ trạng thái JS modules + `npm test` sang baseline runtime có thể chạy/phát hành trên Chrome MV3.
- Ưu tiên **khả năng chạy thật** và **không phá regression** hơn là tối ưu hoá toolchain lớn (không bắt buộc migrate full TypeScript trong story này).

### Guardrails bắt buộc cho Dev Agent

- Không thay đổi behavior business của Epic 1–4 trừ khi cần để wiring runtime.
- Không đổi contract hiện hữu trong `src/shared/lookupContract.js` theo hướng breaking.
- Không thêm quyền mới trong manifest nếu chưa có disclosure tương ứng.
- Tránh “big-bang refactor”; chỉ thêm lớp runtime shell + scripts tối thiểu để đạt AC.

### Technical Requirements

- MV3 manifest phải dùng `background.service_worker` (không dùng background page cũ).
- Toàn bộ truy vấn nguồn từ điển phải là HTTPS.
- Runtime wiring phải tương thích cấu trúc source hiện có dưới `src/`.
- Duy trì naming/convention hiện tại trong codebase (`camelCase` cho JS modules).

### Architecture Compliance

- Bám “Current State vs Target State” và migration milestone trong architecture:
  - Current: JS modules + Node test runner
  - Target: MV3 runtime scaffold + dev/build pipeline
  - Story 5.1 chỉ chốt baseline runtime + scripts.

### File Structure Requirements

- Ưu tiên bổ sung file mới thay vì di chuyển/đổi tên file cũ:
  - `manifest.json` (root hoặc vị trí build-consistent duy nhất trong repo)
  - entry/runtime shell cho `background`, `content`, `popup` dưới `src/`
  - cập nhật `package.json` scripts
- Không thay đổi vị trí các module domain hiện có trong `src/application`, `src/background`, `src/content`, `src/shared`, `src/infrastructure`.

### Testing Requirements

- Bắt buộc chạy: `npm test`.
- Bổ sung test cho baseline manifest/runtime wiring để tránh regressions ở các story tiếp theo (5.2, 5.3).
- Test mới phải deterministic, không phụ thuộc network thật.

### Scope & Non-Goals

- Không triển khai full permission-disclosure audit ở story này (thuộc Story 5.2).
- Không thiết lập đầy đủ quality gates release pipeline (thuộc Story 5.3).
- Không mở rộng UI/UX ngoài popup shell tối thiểu phục vụ runtime baseline.

### Risks cần theo dõi

- Sai khác giữa permission khai báo và disclosure hiện hành có thể phát sinh nếu manifest thêm quyền dư.
- Wiring runtime “chạy được” nhưng không gọi đúng module nếu entrypoint mapping mơ hồ.
- Tooling dev/build mới có thể va chạm với luồng `node --test` hiện tại nếu cấu hình scripts không tách bạch.

## Project Structure Notes

- Repo hiện tại đang ở dạng module-first (JS thuần) với test runner Node.
- Story 5.1 phải giữ cấu trúc này ổn định, chỉ thêm baseline runtime để chuẩn bị cho compliance audit và quality gates ở Epic 5.

## References

- Source: `_bmad-output/planning-artifacts/epics.md` (Epic 5, Story 5.1)
- Source: `_bmad-output/planning-artifacts/architecture.md` (Current State vs Target State, Migration Milestone 1)
- Source: `_bmad-output/planning-artifacts/prd.md` (NFR16)
- Source: `README.md` (disclosure hiện có và script hiện tại)
- Source: `docs/transparency-release-checklist.md` (ràng buộc minh bạch cho permissions/disclosure)
- Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-03-28.md` (động cơ thêm Epic 5)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- `npm test` ✅ (65/65 tests pass)
- `npm run build` ✅ (tạo `dist/` loadable cho Chrome unpacked extension)

### Completion Notes List

- Hoàn tất baseline MV3 manifest (`manifest.json`) với bộ quyền tối thiểu khớp disclosure hiện có.
- Thêm runtime shell cho service worker/content/popup: `runtimeServiceWorker.js`, `runtimeContentScript.js`, popup shell HTML/JS.
- Thiết lập script `dev`/`build` trong `package.json` và thêm build pipeline tối giản trong `scripts/` để đóng gói `dist/`.
- Bổ sung test baseline runtime tại `tests/infrastructure/runtimeBaseline.test.js` (manifest + runtime entry + listener behavior).
- Đã chạy code review tự động và fix toàn bộ findings trong phạm vi story:
  - Chuyển content runtime sang model inject qua `activeTab + scripting` thay vì static broad content script.
  - Chặn duplicate content-runtime bootstrap khi inject lặp.
  - Service worker runtime chỉ mở async channel cho `LOOKUP_REQUEST`.
  - Dev watcher có cơ chế queue rebuild khi có thay đổi trong lúc build đang chạy.
- Xác nhận full regression suite pass sau khi fix.

### File List

- _bmad-output/implementation-artifacts/5-1-thiet-lap-baseline-runtime-manifest-v3-va-script-build-dev.md
- package.json
- manifest.json
- scripts/build-extension.mjs
- scripts/dev-extension.mjs
- src/background/runtimeServiceWorker.js
- src/content/runtimeContentScript.js
- src/popup/popup.html
- src/popup/popup.js
- tests/infrastructure/runtimeBaseline.test.js

### Change Log

- 2026-03-28: Hoàn tất Story 5.1 (MV3 runtime baseline + dev/build scripts + runtime shells + validation tests), đã chạy code review và fix toàn bộ findings trong phạm vi story.
- 2026-03-28: Story 5.1 được duyệt và chuyển trạng thái từ `review` sang `done`.
