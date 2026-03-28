# Sprint Change Proposal — Điều hướng lệch kiến trúc vs hiện trạng code

**Project:** vocabulary-chrome-extension  
**Date:** 2026-03-28  
**Prepared by:** Scrum Master (CC workflow)

---

## 1) Issue Summary

### Trigger story
- Trigger chính: sau khi hoàn tất các story implementation (đặc biệt Epic 4.1–4.2), người dùng phát hiện repo runtime chỉ có cấu trúc JS tối giản và `package.json` chỉ có script `test`.
- Bằng chứng:
  - `package.json` hiện tại chỉ có `"test": "node --test"`.
  - Không có `manifest.json` trong workspace.
  - Tài liệu kiến trúc nêu starter `chrome-ext-starter`, TypeScript strict mode, Vite/pnpm, manifest/build workflow.

### Problem statement
Có **độ lệch baseline** giữa:
1) **Planning artifact** (architecture định hướng starter TypeScript/Vite + MV3 full scaffold), và  
2) **Implementation artifact thực tế** (MVP JS module + unit tests, chưa scaffold extension runtime/build stack).

Điều này gây hiểu nhầm về trạng thái “đã xong story” nhưng chưa có nền tảng build/run extension theo kiến trúc đã mô tả.

---

## 2) Impact Analysis

### 2.1 Epic impact
- Epic 1–4 (logic nghiệp vụ lookup, UX states, settings, telemetry/compliance): **không invalid** về mặt business behavior.
- Tuy nhiên thiếu lớp nền tảng runtime/build làm giảm khả năng:
  - đóng gói extension,
  - triển khai release pipeline,
  - đối chiếu permissions/disclosure với manifest thật.

### 2.2 Artifact conflict
- **PRD:** không mâu thuẫn mục tiêu sản phẩm; nhưng execution plan thiếu work item về “project bootstrap/runtime packaging”.
- **Epics:** thiếu story explicit cho “technical foundation/scaffold alignment”.
- **Architecture:** section Starter Template đang mô tả trạng thái mục tiêu như thể đã áp dụng, chưa phản ánh “target vs current”.
- **UX:** tác động thấp, chủ yếu gián tiếp do chưa có shell runtime để gắn popup/options page thực tế.

### 2.3 Technical impact
- Chưa có MV3 manifest + host permissions thực tế để audit end-to-end.
- Chưa có script `dev/build/lint/typecheck` nên năng lực CI/CD và chất lượng release bị giới hạn.
- Debt tăng nếu tiếp tục thêm feature business trên nền chưa scaffold.

---

## 3) Checklist Execution (tóm tắt)

| Checklist Item | Status | Notes |
|---|---|---|
| 1.1 Trigger story identified | [x] Done | Trigger từ giai đoạn sau DS 4.1–4.2 |
| 1.2 Core problem defined | [x] Done | Baseline lệch giữa architecture vs codebase |
| 1.3 Evidence collected | [x] Done | package.json tối giản, thiếu manifest, architecture nêu starter |
| 2.1 Current epic viability | [x] Done | Epic 1–4 vẫn hợp lệ |
| 2.2 Epic-level changes | [!] Action-needed | Cần thêm epic/story nền tảng kỹ thuật |
| 2.3 Remaining epics reviewed | [x] Done | Epic 4.3 còn mở; cần cân nhắc thứ tự |
| 2.4 Future epics invalidated/new | [!] Action-needed | Cần thêm Epic nền tảng |
| 2.5 Epic sequencing/priority | [!] Action-needed | Đề xuất ưu tiên foundation trước release |
| 3.1 PRD conflicts | [!] Action-needed | Bổ sung yêu cầu execution/packaging rõ ràng |
| 3.2 Architecture conflicts | [!] Action-needed | Cần chỉnh “current state vs target state” |
| 3.3 UX spec conflicts | [N/A] Skip | Không mâu thuẫn trực tiếp |
| 3.4 Other artifacts impact | [x] Done | README, CI, release checklist bị ảnh hưởng |
| 4.1 Option 1 Direct adjustment | [x] Viable | Thêm epic/story nền tảng, không rollback |
| 4.2 Option 2 Rollback | [ ] Not viable | Mất momentum, không cần thiết |
| 4.3 Option 3 MVP review | [x] Viable (partial) | Chỉ cần tinh chỉnh scope kỹ thuật |
| 4.4 Recommended path selected | [x] Done | Hybrid: Option 1 + nhẹ Option 3 |

---

## 4) Recommended Approach

### Selected approach
**Hybrid (Option 1 + light Option 3)**

- **Option 1 (chính):** Direct Adjustment — thêm Epic nền tảng kỹ thuật và update artifacts.
- **Option 3 (nhẹ):** cập nhật PRD/Architecture wording để phân biệt rõ “Target architecture” và “Current implementation baseline”.

### Rationale
- Giữ nguyên giá trị đã hoàn thành ở Epic 1–4 (không rollback).
- Đóng gap runtime/build nhanh, giảm rủi ro release.
- Tránh “đè” thêm business stories lên nền chưa chuẩn.

### Effort / Risk / Timeline
- Effort: **Medium**
- Risk: **Medium-Low** (nếu migration incremental)
- Timeline impact: **+1 sprint ngắn** (hoặc 3 stories kỹ thuật trước release candidate)

---

## 5) Detailed Change Proposals (old → new)

## 5.1 Epics (đề xuất thêm Epic 5)

**Artifact:** `_bmad-output/planning-artifacts/epics.md`

**OLD:**
- Epic 4 là epic cuối cho MVP compliance/operations.

**NEW (proposed):**
- Thêm **Epic 5: Căn chỉnh nền tảng runtime và build pipeline**
  - Story 5.1: Thiết lập MV3 `manifest.json` + wiring scripts nền tảng (`dev/build`).
  - Story 5.2: Đồng bộ permission declarations với disclosure policy (audit runtime với manifest thực).
  - Story 5.3: Thiết lập quality gates (`lint`, `typecheck`/hoặc checklist quality tương đương JS nếu chưa migrate TS).

**Rationale:**
- Biến “kiến trúc mục tiêu” thành executable baseline trước release.

---

## 5.2 Sprint status (đề xuất cập nhật thứ tự)

**Artifact:** `_bmad-output/implementation-artifacts/sprint-status.yaml`

**OLD:**
- `4-3-guardrails...: ready-for-dev`

**NEW (proposed sequencing):**
- Ưu tiên thực hiện 4.3 và ngay sau đó mở Epic 5 (5.1 → 5.3) trước khi đóng epic release.

**Rationale:**
- 4.3 phụ thuộc một phần vào runtime behavior thực; epic 5 giúp kiểm chứng compliance/rate-limit trong môi trường extension thật.

---

## 5.3 Architecture wording correction

**Artifact:** `_bmad-output/planning-artifacts/architecture.md`

**OLD:**
- Section Starter Template được diễn đạt như trạng thái đã áp dụng.

**NEW (proposed):**
- Chia rõ 2 phần:
  1. **Current State (Implemented):** JS modules + Node test runner.
  2. **Target State (Planned):** starter TypeScript/Vite/MV3 + scripts + manifest.
- Thêm “Migration Plan” incremental (milestone 1/2/3).

**Rationale:**
- Tránh hiểu nhầm “story done = scaffold done”.

---

## 5.4 PRD adjustment (nhẹ)

**Artifact:** `_bmad-output/planning-artifacts/prd.md`

**OLD:**
- Không có explicit requirement cho build/runtime scaffolding milestone.

**NEW (proposed):**
- Bổ sung nhóm non-functional delivery requirement:
  - Packaging/deployment readiness cho MV3.
  - Alignment between declared permissions and runtime disclosure must be verifiable from manifest.

**Rationale:**
- Ràng buộc rõ Definition-of-Done cấp release, không chỉ behavior-level tests.

---

## 6) Implementation Handoff

### Scope classification
**Moderate** — cần backlog reorganization nhẹ và phối hợp PO/SM + Dev.

### Handoff recipients
1. **PO/SM**
   - Chèn Epic 5 vào plan, sắp lại thứ tự sprint.
2. **Architect**
   - Chốt migration milestones current→target.
3. **Dev**
   - Triển khai Story 5.1–5.3 theo thứ tự.
4. **QA**
   - Thiết kế smoke checklist cho runtime extension package.

### Success criteria
- Có `manifest.json` hợp lệ và script `dev/build` hoạt động.
- Permission audit chạy trên manifest thật, khớp disclosure.
- CI quality gates chạy ổn định (lint/test + kiểm tra release checklist).

---

## 7) Decision Request

Đề nghị phê duyệt proposal theo hướng **Hybrid** để mở Epic 5 ngay sau 4.3.

- Trạng thái: **Approved by user (yes)**
- Thực thi đã áp dụng: cập nhật `epics.md` + `sprint-status.yaml` + điều chỉnh sections trong `architecture.md`/`prd.md` theo đề xuất.

## 8) Handoff Confirmation

- Scope classification: **Moderate**
- Routed to:
  - **PO/SM**: quản lý backlog Epic 5 và thứ tự sprint
  - **Architect**: bám migration milestones current → target
  - **Dev team**: chuẩn bị triển khai Story 4.3, sau đó Story 5.1 → 5.3
  - **QA**: chuẩn bị smoke checklist release runtime/compliance
