---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/prd-fix-auto-popup-behavior.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/architecture.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/ux-design-specification.md
status: 'complete'
completedAt: '2026-03-30'
---

# Fix Auto-Popup Behavior - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for fixing the auto-popup toggle behavior in vocabulary-chrome-extension, decomposing the requirements from the feature PRD into implementable stories organized by user value.

---

## Requirements Inventory

### Functional Requirements (15 FRs)

**Selection & Trigger Behavior (FR1-FR4)**
- FR1: Hệ thống có thể duy trì selection detection ở trạng thái active bất kể giá trị auto-popup setting
- FR2: Hệ thống có thể xác định chế độ hiện tại (auto-popup ON/OFF) và chọn hành động phù hợp sau khi phát hiện selection hợp lệ
- FR3: Hệ thống có thể hiển thị popup tự động khi auto-popup ON và phát hiện selection hợp lệ
- FR4: Hệ thống có thể hiển thị trigger icon (kính lúp) khi auto-popup OFF và phát hiện selection hợp lệ

**Trigger Icon (FR5-FR8)**
- FR5: Hệ thống có thể render trigger icon dạng kính lúp gần cuối vùng text đã chọn
- FR6: Người dùng có thể click trigger icon để khởi tạo lookup flow cho từ đã chọn
- FR7: Hệ thống có thể ẩn trigger icon khi người dùng click ra ngoài, bỏ chọn text, hoặc sau khi lookup flow được khởi tạo
- FR8: Hệ thống có thể ngăn trigger icon và popup xuất hiện đồng thời

**Quick Toggle (FR9-FR12)**
- FR9: Người dùng có thể bật/tắt auto-popup qua checkbox trong browser action popup
- FR10: Hệ thống có thể hiển thị hint text giải thích hành vi auto-popup bên cạnh checkbox
- FR11: Hệ thống có thể phản ánh đúng trạng thái hiện tại của autoPopupEnabled khi mở browser action popup
- FR12: Hệ thống có thể áp dụng thay đổi setting tức thì trên trang đang mở khi người dùng toggle checkbox

**Settings Synchronization (FR13-FR15)**
- FR13: Hệ thống có thể đồng bộ thay đổi auto-popup setting giữa browser action popup và settings page
- FR14: Hệ thống có thể lưu và khôi phục auto-popup setting giữa các phiên duyệt qua Chrome Storage
- FR15: Hệ thống có thể thông báo content script về thay đổi setting real-time qua Chrome Storage onChanged event

### NonFunctional Requirements (13 NFRs)

**Performance (NFR1-NFR4)**
- NFR1: Trigger icon xuất hiện trong < 200ms sau khi selection hoàn tất
- NFR2: Click trigger icon khởi tạo lookup flow trong < 100ms
- NFR3: Chuyển đổi chế độ auto-popup áp dụng trên trang đang mở trong < 50ms
- NFR4: Selection detection ở chế độ idle không tăng CPU usage đáng kể

**Reliability (NFR5-NFR7)**
- NFR5: Không tạo regression trên luồng lookup hiện tại (auto-popup ON)
- NFR6: Trigger icon hiển thị đúng trên test matrix trang web hiện có
- NFR7: Debounce ngăn trigger icon nhấp nháy khi user bôi đen text nhanh liên tục

**Security & Privacy (NFR8-NFR9)**
- NFR8: Trigger icon sử dụng Shadow DOM isolation nhất quán với popup hiện tại
- NFR9: Không lưu thêm dữ liệu ngoài autoPopupEnabled setting đã có

**Accessibility (NFR10-NFR11)**
- NFR10: Trigger icon có semantic label mô tả chức năng
- NFR11: Trigger icon có thể dismiss bằng phím Escape

**Compatibility (NFR12-NFR13)**
- NFR12: Feature hoạt động trên Chrome stable hiện hành
- NFR13: Quick toggle tương thích với browser action popup hiện có

### Additional Requirements

- Shadow DOM isolation cho trigger icon, nhất quán với popup hiện tại (từ Architecture + project-context.md)
- `stopPropagation()` trên pointer events bên trong trigger icon (từ project-context.md)
- Dependency injection cho testability (từ project-context.md)
- Tagged Union response pattern cho message passing (từ project-context.md)

### UX Design Requirements

- UX-DR1: Trigger icon dùng kính lúp (🔍), kích thước ~24x24px, clickable area đủ lớn
- UX-DR2: Trigger icon positioning gần cuối vùng selection, tái sử dụng logic từ `popupPositioning.js`
- UX-DR3: Trigger icon tự ẩn mượt khi click outside / deselect / click icon
- UX-DR4: Quick toggle checkbox theo style "Scholarly Calm" hiện tại của extension
- UX-DR5: Hint text ngắn gọn, rõ ràng bên dưới/cạnh checkbox

### FR Coverage Map

FR1: Epic 1 - Selection detection luôn active
FR2: Epic 1 - Mode-aware behavior routing
FR3: Epic 1 - Auto-popup ON behavior (giữ nguyên)
FR4: Epic 1 - Trigger icon khi auto-popup OFF
FR5: Epic 1 - Render trigger icon
FR6: Epic 1 - Click trigger icon → lookup
FR7: Epic 1 - Ẩn trigger icon
FR8: Epic 1 - Ngăn icon và popup đồng thời
FR9: Epic 2 - Quick toggle checkbox
FR10: Epic 2 - Hint text
FR11: Epic 2 - Phản ánh trạng thái hiện tại
FR12: Epic 2 - Áp dụng setting tức thì
FR13: Epic 2 - Đồng bộ setting
FR14: Epic 2 - Persist setting
FR15: Epic 2 - Real-time notify content script

## Epic List

### Epic 1: Dual-Mode Lookup Behavior
Người dùng có thể tra từ bằng cả hai chế độ: tự động (popup ngay khi bôi đen) hoặc thủ công (click icon kính lúp). Selection detection luôn hoạt động bất kể chế độ nào.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8

### Epic 2: Quick Toggle & Settings Integration
Người dùng có thể chuyển đổi nhanh giữa hai chế độ auto-popup qua checkbox trong browser action popup, với thay đổi áp dụng tức thì và đồng bộ real-time.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15

---

## Epic 1: Dual-Mode Lookup Behavior

Hoàn thiện hành vi auto-popup toggle để cung cấp hai luồng trải nghiệm tra từ song song. Selection detection luôn active, hành động sau detection thay đổi theo setting.

### Story 1.1: Refactor selection detection để luôn active

As a người dùng extension,
I want selection detection luôn hoạt động bất kể auto-popup setting,
So that tôi luôn có thể tra từ dù ở chế độ nào.

**Acceptance Criteria:**

1. Given auto-popup setting là ON hoặc OFF, When hệ thống khởi động content runtime, Then selection detection listener được đăng ký và active.

2. Given auto-popup đang ON và người dùng chuyển sang OFF, When `applyAutoPopupEnabled(false)` được gọi, Then selection detection KHÔNG bị stop, And chỉ hành động sau detection thay đổi.

3. Given auto-popup đang OFF và người dùng chuyển sang ON, When `applyAutoPopupEnabled(true)` được gọi, Then selection detection vẫn active, And hành động sau detection chuyển sang auto-popup.

4. Given selection detection đang active, When chạy test suite hiện tại, Then tất cả test hiện có vẫn pass (không regression).

### Story 1.2: Tạo trigger icon component

As a người dùng extension với auto-popup TẮT,
I want thấy icon kính lúp nhỏ gần từ đã bôi đen,
So that tôi biết extension nhận ra selection và có thể tra từ khi cần.

**Acceptance Criteria:**

1. Given auto-popup OFF và người dùng bôi đen một từ hợp lệ, When selection detection phát hiện selection, Then icon kính lúp (🔍, ~24x24px) xuất hiện gần cuối vùng text đã chọn trong < 200ms.

2. Given trigger icon đang hiển thị, When icon được render, Then icon nằm trong Shadow DOM để tránh style leakage từ host page, And icon có z-index đủ cao để không bị nội dung trang che.

3. Given trigger icon đang hiển thị, When icon được render, Then icon có `aria-label="Look up definition"` để hỗ trợ screen reader.

4. Given trigger icon đang hiển thị, When pointer events xảy ra trên icon, Then `stopPropagation()` được gọi để ngăn trang web xử lý event.

### Story 1.3: Kết nối trigger icon với lookup flow

As a người dùng extension với auto-popup TẮT,
I want click icon kính lúp để tra nghĩa từ đã chọn,
So that tôi tra từ chỉ khi cần mà vẫn dùng được extension đầy đủ.

**Acceptance Criteria:**

1. Given trigger icon đang hiển thị cho một từ đã chọn, When người dùng click icon, Then lookup flow được khởi tạo cho từ đó trong < 100ms, And popup loading skeleton xuất hiện, And trigger icon biến mất.

2. Given trigger icon đang hiển thị, When người dùng click ra ngoài icon và vùng selection, Then trigger icon biến mất, And không có lookup request nào được gửi.

3. Given trigger icon đang hiển thị, When người dùng bỏ chọn text (click vào vùng khác), Then trigger icon biến mất.

4. Given trigger icon đang hiển thị, When người dùng bôi đen text nhanh liên tục, Then debounce ngăn icon nhấp nháy, And chỉ icon cuối cùng hiển thị ổn định.

### Story 1.4: Mode switching và cleanup giữa icon và popup

As a người dùng extension,
I want chuyển đổi giữa auto-popup ON và OFF mà không bị lỗi hiển thị,
So that trải nghiệm mượt mà bất kể tôi đổi chế độ lúc nào.

**Acceptance Criteria:**

1. Given auto-popup ON và popup đang hiển thị, When setting chuyển sang OFF, Then popup hiện tại KHÔNG bị đóng (đang xem kết quả), And lần selection tiếp theo sẽ hiện trigger icon thay vì popup tự động.

2. Given auto-popup OFF và trigger icon đang hiển thị, When setting chuyển sang ON, Then trigger icon biến mất, And lần selection tiếp theo sẽ trigger popup tự động.

3. Given bất kỳ trạng thái nào, When có selection mới, Then hệ thống KHÔNG bao giờ hiển thị cả trigger icon và popup đồng thời.

4. Given người dùng nhấn phím Escape, When trigger icon đang hiển thị, Then trigger icon biến mất.

---

## Epic 2: Quick Toggle & Settings Integration

Thêm checkbox quick toggle trong browser action popup để chuyển đổi nhanh giữa hai chế độ, đồng bộ real-time với content script.

### Story 2.1: Thêm checkbox auto-popup trong browser action popup

As a người dùng extension,
I want bật/tắt auto-popup ngay trong popup extension trên toolbar,
So that tôi chuyển đổi chế độ nhanh mà không cần mở settings.

**Acceptance Criteria:**

1. Given người dùng mở browser action popup (click icon extension trên toolbar), When popup hiển thị, Then có checkbox "Auto-popup" với trạng thái checked/unchecked phản ánh đúng giá trị `autoPopupEnabled` hiện tại.

2. Given checkbox hiển thị, When người dùng nhìn vào checkbox, Then có hint text ngắn gọn giải thích hành vi (ví dụ: "Tự động hiện định nghĩa khi bôi đen từ").

3. Given checkbox hiển thị, When người dùng toggle checkbox, Then giá trị `autoPopupEnabled` được lưu vào Chrome Storage tức thì, And checkbox phản ánh trạng thái mới ngay lập tức.

4. Given checkbox hiển thị, When popup được render, Then UI nhất quán với style hiện có của browser action popup, And không phá vỡ layout hiện tại.

### Story 2.2: Đồng bộ real-time và áp dụng tức thì

As a người dùng extension,
I want thay đổi auto-popup setting được áp dụng ngay trên trang đang mở,
So that tôi không cần reload trang để thấy hành vi mới.

**Acceptance Criteria:**

1. Given người dùng toggle checkbox trong browser action popup, When giá trị mới được lưu vào Chrome Storage, Then content script trên trang đang mở nhận được thông báo qua Chrome Storage onChanged event trong < 50ms, And hành vi selection detection chuyển sang chế độ mới ngay lập tức.

2. Given người dùng thay đổi auto-popup trong settings page, When mở browser action popup, Then checkbox phản ánh đúng giá trị mới nhất (đồng bộ hai chiều).

3. Given auto-popup setting được thay đổi từ bất kỳ nguồn nào, When setting được lưu, Then giá trị persist qua Chrome Storage, And khi mở tab mới hoặc restart browser, setting được khôi phục đúng.

4. Given nhiều tab đang mở, When thay đổi auto-popup setting, Then tất cả tab nhận được thay đổi real-time qua Chrome Storage onChanged event.

### Story 2.3: Test coverage cho cả hai luồng

As a developer,
I want có test đầy đủ cho cả hai chế độ auto-popup và quick toggle,
So that tôi tự tin rằng feature hoạt động đúng và không regression.

**Acceptance Criteria:**

1. Given test suite, When chạy `npm test`, Then có test cho trigger icon render khi auto-popup OFF + valid selection, And có test cho trigger icon KHÔNG render khi auto-popup ON.

2. Given test suite, When chạy `npm test`, Then có test cho click trigger icon → lookup flow triggered, And có test cho click outside → icon dismissed, And có test cho debounce behavior.

3. Given test suite, When chạy `npm test`, Then có test cho quick toggle checkbox → Chrome Storage update, And có test cho Chrome Storage change → content script behavior update.

4. Given test suite, When chạy `npm test`, Then có test cho cleanup: icon và popup không xuất hiện đồng thời, And có test cho Escape key dismiss trigger icon.

5. Given toàn bộ test suite (cũ + mới), When chạy `npm test`, Then tất cả test pass (0 failures).
