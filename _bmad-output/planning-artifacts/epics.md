---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/prd.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/architecture.md
  - /Users/cuongnguyenhuu/Projects/personal/vocabulary-chrome-extension/_bmad-output/planning-artifacts/ux-design-specification.md
status: 'complete'
completedAt: '2026-03-30'
---

# vocabulary-chrome-extension - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for vocabulary-chrome-extension, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories organized by user value and technical delivery.

---

## Requirements Inventory

### Functional Requirements (30 FRs)

**Selection & Lookup Trigger (FR1-FR4)**
- FR1: Người dùng có thể bôi đen một từ tiếng Anh trên trang web để khởi tạo tra cứu
- FR2: Hệ thống có thể xác định selection hiện tại và trích xuất token mục tiêu
- FR3: Hệ thống có thể ngăn kích hoạt lookup khi selection rỗng hoặc không hợp lệ
- FR4: Người dùng có thể bật/tắt chế độ tự động hiện popup khi bôi đen

**Token Processing (FR5-FR8)**
- FR5: Hệ thống có thể chuẩn hóa token đầu vào (chữ thường, loại ký tự thừa)
- FR6: Hệ thống có thể xử lý dấu câu bám trước/sau từ để tăng tỷ lệ tra cứu đúng
- FR7: Hệ thống có thể giới hạn tra cứu mặc định cho một từ đơn trong MVP
- FR8: Hệ thống có thể trả trạng thái không hợp lệ khi token không đáp ứng quy tắc lookup

**Dictionary Data Retrieval (FR9-FR12)**
- FR9: Hệ thống có thể xây dựng URL dictionary tương ứng theo headword chuẩn hóa
- FR10: Hệ thống có thể gửi yêu cầu lookup và nhận phản hồi trong ngữ cảnh extension
- FR11: Hệ thống có thể áp dụng timeout cho yêu cầu lookup để tránh treo UI
- FR12: Hệ thống có thể thực hiện retry có kiểm soát cho lỗi tạm thời

**Parsing & Data Mapping (FR13-FR16)**
- FR13: Hệ thống có thể trích xuất các trường dữ liệu cốt lõi (headword, pronunciation, định nghĩa chính)
- FR14: Hệ thống có thể suy luận `not found` khi không có dữ liệu khả dụng cho từ
- FR15: Hệ thống có thể fallback sang thông báo lỗi thân thiện khi parse thất bại
- FR16: Hệ thống có thể ánh xạ dữ liệu parse về định dạng hiển thị thống nhất cho popup

**Popup Presentation (FR17-FR22)**
- FR17: Hệ thống có thể hiển thị popup gần vùng selection của người dùng
- FR18: Người dùng có thể đóng popup thủ công
- FR19: Hệ thống có thể hiển thị trạng thái `loading` trong thời gian lookup
- FR20: Hệ thống có thể hiển thị trạng thái `success` với thông tin từ vựng cốt lõi
- FR21: Hệ thống có thể hiển thị trạng thái `not found` kèm hướng dẫn thao tác lại
- FR22: Hệ thống có thể hiển thị trạng thái `error` khi có lỗi mạng hoặc parse

**Settings & Preferences (FR23-FR24)**
- FR23: Người dùng có thể cấu hình hành vi auto popup trong phần cài đặt extension
- FR24: Hệ thống có thể lưu và áp dụng lại cài đặt người dùng giữa các phiên duyệt

**Observability & Support (FR25-FR27)**
- FR25: Hệ thống có thể ghi nhận sự kiện lookup thành công/thất bại ở mức ẩn danh
- FR26: Hệ thống có thể ghi nhận loại lỗi chính (network, timeout, parse, invalid token)
- FR27: Hệ thống có thể hỗ trợ truy vết sự cố theo phiên bản extension

**Compliance & Governance (FR28-FR30)**
- FR28: Hệ thống có thể hiển thị thông tin nguồn/attribution theo chính sách đã phê duyệt
- FR29: Hệ thống có thể vận hành với cơ chế giới hạn truy vấn để tránh khai thác hệ thống nguồn quá mức
- FR30: Hệ thống có thể cung cấp mô tả quyền truy cập dữ liệu rõ ràng trong tài liệu phát hành

---

### Non-Functional Requirements (15 NFRs)

**Performance (NFR1-NFR3)**
- NFR1: ≥70% lookups hoàn tất trong dưới 1.5 giây ở điều kiện mạng ổn định
- NFR2: Thời gian render trạng thái `loading` sau trigger lookup phải dưới 200 ms
- NFR3: Lookup timeout mặc định không vượt quá 3 giây trước khi chuyển sang trạng thái lỗi

**Reliability (NFR4-NFR6)**
- NFR4: ≥95% lookup có kết thúc hữu ích (`success/not found/error`)
- NFR5: Khi parser lỗi, hệ thống phải luôn trả về trạng thái lỗi an toàn, không làm hỏng trang
- NFR6: Cơ chế retry không vượt quá số lần giới hạn cấu hình để tránh vòng lặp lỗi

**Security & Privacy (NFR7-NFR9)**
- NFR7: Không lưu nội dung trang web đầy đủ hoặc dữ liệu cá nhân không cần thiết
- NFR8: Dữ liệu cài đặt người dùng lưu cục bộ theo cơ chế storage an toàn của extension
- NFR9: Toàn bộ luồng truy vấn phải sử dụng kết nối bảo mật (HTTPS)

**Accessibility (NFR10-NFR11)**
- NFR10: Popup có thể đóng bằng bàn phím và có focus state rõ ràng
- NFR11: Các thành phần chính trong popup có semantic label hỗ trợ screen reader cơ bản

**Compatibility & Integration (NFR12-NFR13)**
- NFR12: Extension phải hoạt động ổn định trên phiên bản Chrome stable được hỗ trợ
- NFR13: Hệ thống phải xử lý được các trang tĩnh và một tập trang SPA phổ biến

**Compliance (NFR14-NFR15)**
- NFR14: Nội dung disclosure quyền truy cập và quyền riêng tư phải khớp hành vi thực tế
- NFR15: Luồng khai thác dữ liệu phải tuân thủ chiến lược pháp lý đã phê duyệt

---

### Additional Requirements (Architecture)

**Parser & Adapter Pattern (AR1)**
- AR1: Sử dụng Adapter Pattern cho parser module để thay thế nhanh khi nguồn Vocabulary.com thay đổi

**Caching Strategy (AR2-AR4)**
- AR2: Triển khai Per-Word TTL Cache sử dụng Chrome Storage API với TTL 30 ngày
- AR3: Caching key format: normalized word (lowercase, punctuation-stripped)
- AR4: Cache entry phải lưu: word, headword, pronunciation, definitions[], cachedAt, expiresAt

**Selection Detection (AR5)**
- AR5: Multipoint Selection Detection: listen mouseup, touchend, keyup với debounce 150ms

**Error Handling (AR6-AR7)**
- AR6: Implement Progressive Fallback UI: loading → (success | not-found | error)
- AR7: Service Worker responses phải dùng Tagged Union type: status + data/suggestion/errorType

**Word Normalization (AR8)**
- AR8: Word normalization flow: raw input → strip punctuation → lowercase → cache lookup/parser

**Starter Template (AR9)**
- AR9: Sử dụng `chrome-ext-starter` (React + Vite + Tailwind + DaisyUI) làm nền tảng.

---

### UX Design Requirements (12 UX-DRs)

**Popup Presentation & States (UX-DR1-UX-DR6)**
- UX-DR1: Popup phải hiển thị ngay cạnh vùng selection không che khuất nội dung chính (max width 420px)
- UX-DR2: Popup phải hiển thị 4 trạng thái rõ ràng: loading → success/not-found/error
- UX-DR3: Success state phải hiển thị: headword + pronunciation + định nghĩa chính
- UX-DR4: Not-found state phải hiển thị hướng dẫn: "Thử bỏ dấu câu / chọn một từ / thử từ gốc"
- UX-DR5: Error state phải phân biệt: network error vs parse error với guidance cụ thể
- UX-DR6: Loading animation phải xuất hiện trong 200ms để đảm bảo user feedback ngay

**Interaction & Dismissal (UX-DR7)**
- UX-DR7: Popup phải có thể đóng bằng Esc hoặc click ngoài

**Visual Design System (UX-DR8-UX-DR12)**
- UX-DR8: Sử dụng color scheme "Scholarly Calm" với primary #0B5EA8 (xanh tin cậy)
- UX-DR9: Typography: Inter font, type scale: word-title 40px/700, body 16px/400
- UX-DR10: Spacing: 8pt grid, padding 16px, block spacing 12-16px, radius 12px
- UX-DR11: Contrast tối thiểu WCAG AA cho tất cả text
- UX-DR12: Hỗ trợ keyboard navigation: Tab/Shift-Tab + Esc dismiss, focus ring luôn nhìn thấy

---

### FR Coverage Map

- FR1: Epic 2 - Trigger tra cứu bằng thao tác bôi đen
- FR2: Epic 2 - Nhận diện selection và trích xuất token
- FR3: Epic 2 - Chặn trigger với selection không hợp lệ
- FR4: Epic 4 - Bật/tắt auto-popup theo tùy chọn người dùng
- FR5: Epic 2 - Chuẩn hóa token đầu vào
- FR6: Epic 2 - Xử lý dấu câu trước/sau từ
- FR7: Epic 2 - Giới hạn tra cứu 1 từ trong MVP
- FR8: Epic 2 - Trả trạng thái invalid token
- FR9: Epic 2 - Tạo URL dictionary theo headword chuẩn hóa
- FR10: Epic 2 - Gửi yêu cầu lookup và nhận phản hồi
- FR11: Epic 3 - Áp dụng timeout để tránh treo UI
- FR12: Epic 3 - Retry có kiểm soát cho lỗi tạm thời
- FR13: Epic 2 - Parse các trường dữ liệu cốt lõi
- FR14: Epic 3 - Suy luận not-found khi không có dữ liệu
- FR15: Epic 3 - Fallback lỗi thân thiện khi parse thất bại
- FR16: Epic 2 - Ánh xạ dữ liệu parse sang model hiển thị thống nhất
- FR17: Epic 2 - Hiển thị popup gần vùng selection
- FR18: Epic 2 - Đóng popup thủ công
- FR19: Epic 2 - Hiển thị trạng thái loading
- FR20: Epic 2 - Hiển thị trạng thái success
- FR21: Epic 3 - Hiển thị trạng thái not-found kèm hướng dẫn
- FR22: Epic 3 - Hiển thị trạng thái error theo loại lỗi
- FR23: Epic 4 - Cấu hình hành vi auto-popup trong settings
- FR24: Epic 4 - Lưu và áp dụng lại tùy chọn giữa các phiên
- FR25: Epic 5 - Ghi nhận sự kiện lookup ẩn danh
- FR26: Epic 5 - Ghi nhận phân loại lỗi chính
- FR27: Epic 5 - Truy vết sự cố theo phiên bản extension
- FR28: Epic 5 - Hiển thị attribution nguồn dữ liệu
- FR29: Epic 1 & 5 - Tuân thủ và Baseline runtime
- FR30: Epic 1 & 5 - Disclosure quyền truy cập dữ liệu

---

## Epic List

### Epic 1: Thiết lập nền tảng và môi trường phát triển (Foundation)
Thiết lập scaffold dự án, cấu hình build pipeline và các quality gates cơ bản để đảm bảo môi trường phát triển nhất quán.
**FRs covered:** FR29, FR30, AR9, NFR16

### Epic 2: Tra cứu từ vựng tức thì trong luồng đọc
Người dùng có thể bôi đen 1 từ và nhận định nghĩa cốt lõi ngay trong popup để tiếp tục đọc không đứt mạch.
**FRs covered:** FR1, FR2, FR3, FR5, FR6, FR7, FR8, FR9, FR10, FR13, FR16, FR17, FR18, FR19, FR20

### Epic 3: Xử lý tình huống khó và phục hồi trải nghiệm
Người dùng vẫn được hướng dẫn rõ ràng khi timeout, parse lỗi, không tìm thấy từ, hoặc lỗi mạng.
**FRs covered:** FR11, FR12, FR14, FR15, FR21, FR22

### Epic 4: Cá nhân hóa hành vi tra cứu
Người dùng có thể bật/tắt auto-popup và hệ thống ghi nhớ tùy chọn giữa các phiên duyệt.
**FRs covered:** FR4, FR23, FR24

### Epic 5: Vận hành tin cậy, minh bạch và tuân thủ
Sản phẩm có telemetry ẩn danh, attribution rõ ràng, rate-limit và disclosure đầy đủ để vận hành bền vững.
**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30

---

## Epic 1: Thiết lập nền tảng và môi trường phát triển (Foundation)

Thiết lập scaffold dự án, cấu hình build pipeline và các quality gates cơ bản để đảm bảo môi trường phát triển nhất quán.

### Story 1.1: Khởi tạo dự án từ starter template
As a developer,
I want khởi tạo dự án từ template `chrome-ext-starter`,
So that tôi có sẵn cấu trúc React + Vite + Tailwind vững chắc.

**Acceptance Criteria:**
**Given** dự án mới bắt đầu
**When** thực hiện clone và cài đặt `chrome-ext-starter`
**Then** dự án có cấu trúc thư mục chuẩn (src/content, src/background, src/popup)
**And** có thể chạy `pnpm dev` để xem extension mẫu.

### Story 1.2: Cấu hình baseline Manifest V3 và script build/dev
As a developer,
I want cấu hình manifest và các script build tùy chỉnh,
So that extension hoạt động đúng theo yêu cầu Manifest V3 của dự án.

**Acceptance Criteria:**
**Given** scaffold template đã có
**When** cập nhật `manifest.json`
**Then** các quyền `activeTab`, `scripting`, `storage` được khai báo đúng
**And** script `build` tạo ra artifact sẵn sàng nạp vào Chrome.

### Story 1.3: Thiết lập quality gates cho release readiness
As a developer,
I want có công cụ tự động kiểm tra chất lượng trước khi release,
So that tránh các lỗi về quyền hạn và compliance khi publish.

**Acceptance Criteria:**
**Given** code đã sẵn sàng
**When** chạy script quality gate
**Then** thực hiện được audit permission-disclosure
**And** báo cáo alignment được lưu lại làm bằng chứng release.

---

## Epic 2: Tra cứu từ vựng tức thì trong luồng đọc

Người dùng có thể bôi đen 1 từ và nhận định nghĩa cốt lõi ngay trong popup để tiếp tục đọc không đứt mạch.

### Story 2.1: Phát hiện selection hợp lệ và khởi tạo tra cứu
As a người học tiếng Anh,
I want extension nhận diện chính xác selection hợp lệ,
So that tôi có thể bắt đầu tra cứu ngay tại vị trí đang đọc.

**Acceptance Criteria:**
**Given** người dùng bôi đen một từ tiếng Anh hợp lệ
**When** sự kiện selection được bắt bởi content script
**Then** hệ thống tạo yêu cầu lookup mới
**And** không tạo nhiều trigger trùng lặp trong một thao tác chọn từ.

### Story 2.2: Chuẩn hóa token đầu vào cho MVP một từ
As a người học tiếng Anh,
I want token được chuẩn hóa trước khi tra cứu,
So that kết quả lookup chính xác và ổn định hơn.

**Acceptance Criteria:**
**Given** token có chữ hoa/chữ thường lẫn dấu câu ở hai đầu
**When** token đi qua pipeline chuẩn hóa
**Then** token được chuyển thành lowercase và loại bỏ ký tự thừa ở biên
**And** giữ lại nội dung từ cần tra cứu.

### Story 2.3: Gửi lookup request và hiển thị loading ngay tức thì
As a người học tiếng Anh,
I want hệ thống gửi yêu cầu tra cứu sau khi token hợp lệ,
So that tôi nhận được phản hồi nhanh mà không rời trang.

**Acceptance Criteria:**
**Given** token normalized hợp lệ
**When** service worker xử lý lookup
**Then** URL dictionary được tạo đúng theo headword chuẩn hóa
**And** request được gửi đi trong ngữ cảnh extension.

### Story 2.4: Parse dữ liệu cốt lõi và ánh xạ sang model hiển thị
As a người học tiếng Anh,
I want dữ liệu từ dictionary được parse thành cấu trúc thống nhất,
So that popup có thể hiển thị thông tin rõ ràng và nhất quán.

**Acceptance Criteria:**
**Given** HTML response hợp lệ từ nguồn dictionary
**When** parser adapter thực thi
**Then** hệ thống trích xuất được headword, pronunciation và định nghĩa chính
**And** dữ liệu được ánh xạ về model hiển thị chuẩn.

### Story 2.5: Hiển thị popup gần vùng chọn và cho phép đóng thủ công
As a người học tiếng Anh,
I want popup luôn xuất hiện gần vùng bôi đen và dễ đóng,
So that tôi giữ được mạch đọc và kiểm soát giao diện.

**Acceptance Criteria:**
**Given** lookup đang ở trạng thái loading hoặc success
**When** popup được gắn vào viewport
**Then** popup xuất hiện gần vùng selection
**And** không che khuất phần nội dung quan trọng quá mức.

---

## Epic 3: Xử lý tình huống khó và phục hồi trải nghiệm

Người dùng vẫn được hướng dẫn rõ ràng khi timeout, parse lỗi, không tìm thấy từ, hoặc lỗi mạng.

### Story 3.1: Timeout và retry có kiểm soát cho lookup
As a người học tiếng Anh,
I want hệ thống xử lý timeout và retry hợp lý,
So that tôi không bị treo UI khi kết nối kém.

**Acceptance Criteria:**
**Given** request lookup vượt quá ngưỡng timeout
**When** service worker kiểm tra thời gian chờ
**Then** request được kết thúc an toàn
**And** hệ thống chuyển sang nhánh lỗi có hướng dẫn.

### Story 3.2: Trạng thái not-found với hướng dẫn hành động
As a người học tiếng Anh,
I want nhận được hướng dẫn cụ thể khi không tìm thấy từ,
So that tôi có thể thao tác lại đúng cách.

**Acceptance Criteria:**
**Given** lookup không có dữ liệu từ điển khả dụng
**When** parser hoặc mapper xác nhận kết quả rỗng
**Then** popup hiển thị trạng thái not-found
**And** hiển thị gợi ý thao tác lại (bỏ dấu câu/chọn 1 từ/thử từ gốc).

### Story 3.3: Trạng thái error theo loại lỗi (network/parse)
As a người học tiếng Anh,
I want thông báo lỗi rõ nguyên nhân,
So that tôi biết phải làm gì tiếp theo thay vì bị bối rối.

**Acceptance Criteria:**
**Given** lỗi network hoặc timeout
**When** hệ thống trả kết quả lỗi
**Then** popup hiển thị thông báo lỗi tương ứng
**And** cung cấp hành động tiếp theo phù hợp.

---

## Epic 4: Cá nhân hóa hành vi tra cứu

Người dùng có thể bật/tắt auto-popup và hệ thống ghi nhớ tùy chọn giữa các phiên duyệt.

### Story 4.1: Cài đặt bật/tắt auto-popup
As a người học tiếng Anh,
I want cấu hình auto-popup theo thói quen của tôi,
So that tôi kiểm soát được mức độ tự động của extension.

**Acceptance Criteria:**
**Given** người dùng mở màn hình cài đặt extension
**When** người dùng thay đổi công tắc auto-popup
**Then** hệ thống cập nhật giá trị cài đặt mới
**And** hành vi trigger lookup tuân theo giá trị vừa chọn.

### Story 4.2: Lưu và áp dụng lại tùy chọn qua các phiên
As a người học tiếng Anh,
I want tùy chọn của tôi được ghi nhớ lâu dài,
So that tôi không phải cấu hình lại mỗi lần mở trình duyệt.

**Acceptance Criteria:**
**Given** người dùng đã lưu tùy chọn auto-popup
**When** trình duyệt hoặc extension được khởi động lại
**Then** cài đặt được nạp lại từ storage local
**And** áp dụng đúng cho phiên duyệt mới.

---

## Epic 5: Vận hành tin cậy, minh bạch và tuân thủ

Sản phẩm có telemetry ẩn danh, attribution rõ ràng, rate-limit và disclosure đầy đủ để vận hành bền vững.

### Story 5.1: Telemetry ẩn danh cho thành công/thất bại lookup
As a product operator,
I want hệ thống ghi nhận sự kiện lookup và phân loại lỗi,
So that tôi có thể theo dõi sức khỏe sản phẩm và truy vết sự cố.

**Acceptance Criteria:**
**Given** một lookup kết thúc
**When** hệ thống ghi log sự kiện
**Then** sự kiện được lưu ở dạng ẩn danh với loại kết quả (success/not-found/error)
**And** kèm phân loại lỗi chính khi có lỗi.

### Story 5.2: Attribution nguồn dữ liệu và disclosure quyền truy cập
As a người dùng extension,
I want thấy rõ nguồn dữ liệu và quyền truy cập được sử dụng,
So that tôi tin tưởng sản phẩm minh bạch và đúng chính sách.

**Acceptance Criteria:**
**Given** người dùng xem popup hoặc trang thông tin extension
**When** hệ thống hiển thị thông tin nguồn dữ liệu
**Then** attribution được hiển thị theo chính sách đã phê duyệt.

### Story 5.3: Guardrails tuân thủ với rate-limit và cache
As a product operator,
I want có cơ chế giới hạn truy vấn hợp lý,
So that extension vận hành bền vững và giảm rủi ro vi phạm điều khoản nguồn.

**Acceptance Criteria:**
**Given** cùng một từ được tra cứu lặp lại
**When** dữ liệu cache còn hiệu lực
**Then** hệ thống ưu tiên dùng cache trước network
**And** giảm số request ra nguồn dữ liệu.

---

### Epic 6: Nâng tầm trải nghiệm và khả năng tự phục hồi (Phase 2)
Người dùng có lối thoát nhanh chóng thông qua các từ điển uy tín khác khi nguồn Vocabulary.com không có kết quả.
**FRs covered:** FR21, FR31, FR32

---

## Epic 6: Nâng tầm trải nghiệm và khả năng tự phục hồi (Phase 2)

### Story 6.1: Tạo link tìm kiếm từ điển ngoại trong ViewModelMapper
As a developer,
I want logic sinh URL tìm kiếm ngoại được đặt tại Mapper,
So that background service luôn tinh gọn và dễ dàng thay đổi nguồn link sau này.

**Acceptance Criteria:**
**Given** lookup trả về trạng thái `not-found` kèm `token`
**When** dữ liệu đi qua `mapLookupResultToPopupViewModel`
**Then** hệ thống tạo ra chuỗi URL hợp lệ cho Google, Cambridge, Oxford
**And** các URL được URI-encode đúng cách để tránh lỗi ký tự đặc biệt.

### Story 6.2: Cập nhật giao diện Popup cho trạng thái Not Found
As a người học tiếng Anh,
I want thấy các link tìm kiếm ngoại ngay trên popup khi không tìm thấy từ,
So that tôi có thể tra cứu ở nguồn khác chỉ với 1 cú click.

**Acceptance Criteria:**
**Given** popup đang ở trạng thái `not-found`
**When** renderer hiển thị nội dung
**Then** dòng "Thử tìm kiếm tại: Google | Cambridge | Oxford" xuất hiện trên cùng của danh sách gợi ý
**And** các link có màu xanh Scholarly và hiệu ứng hover gạch chân đúng thiết kế.

### Story 6.3: Kiểm thử tích hợp và bảo mật cho link ngoại
As a QA engineer,
I want đảm bảo các link ngoại hoạt động đúng và an toàn,
So that không gây rủi ro bảo mật hoặc làm người dùng rời khỏi trang hiện tại.

**Acceptance Criteria:**
**Given** người dùng click vào một link từ điển ngoại
**When** trình duyệt xử lý sự kiện click
**Then** trang từ điển tương ứng được mở trong một tab mới
**And** link có thuộc tính `rel="noopener noreferrer"` để bảo vệ phiên duyệt hiện tại.

---

✅ **Step 1 Complete:** Requirements extracted and confirmed.
✅ **Step 2 Complete:** Epic structure approved and mapped to FRs.
✅ **Step 3 Complete:** All epic stories and acceptance criteria generated.
✅ **Step 4 Complete:** Final validation passed. Epic 1 redefined as Foundation.

**Workflow Complete!** Ready for development.
