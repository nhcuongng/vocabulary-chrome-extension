export const DATA_SOURCE_ATTRIBUTION = {
  providerName: 'Vocabulary.com',
  providerUrl: 'https://www.vocabulary.com/',
  policyLabel: 'Nguồn dữ liệu tham khảo',
};

export const PERMISSION_DISCLOSURE_ITEMS = [
  {
    permission: 'activeTab',
    rationale: 'Chỉ đọc từ bạn chủ động bôi đen trên tab đang xem để khởi tạo tra cứu.',
  },
  {
    permission: 'scripting',
    rationale: 'Tiêm content script cho đúng tab đang dùng nhằm bắt selection và hiển thị popup.',
  },
  {
    permission: 'storage',
    rationale: 'Lưu cài đặt auto-popup và telemetry ẩn danh cục bộ trên trình duyệt.',
  },
  {
    permission: 'host:https://www.vocabulary.com/*',
    rationale: 'Gửi yêu cầu tra cứu từ và nhận nội dung định nghĩa từ nguồn đã công bố.',
  },
];

function normalizePermissionName(permission) {
  if (typeof permission !== 'string') {
    return '';
  }

  return permission.trim();
}

function normalizeHostPermission(permission) {
  const normalized = normalizePermissionName(permission);
  if (!normalized) {
    return '';
  }

  return normalized.startsWith('host:') ? normalized : `host:${normalized}`;
}

function formatPermissionLabel(permission) {
  const normalized = normalizePermissionName(permission);
  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('host:')) {
    return normalized;
  }

  return normalized;
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

// Attribution with icon and hover tooltip for full text
export function buildAttributionText() {
  return `<span style="display:inline-block;vertical-align:middle;">
    <span title='Nguồn dữ liệu: Vocabulary.com (https://www.vocabulary.com/)' style="cursor:help;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px;"><circle cx="10" cy="10" r="9" stroke="#888" stroke-width="2" fill="#f6f8fa"/><text x="10" y="15" text-anchor="middle" font-size="12" fill="#888" font-family="Arial, sans-serif">i</text></svg>
    </span>
    <span style="color:#888;font-size:12px;">Vocabulary.com</span>
  </span>`;
}

// Permission disclosure with icon and hover for full text
export function buildPermissionDisclosureSummary() {
  const permissions = PERMISSION_DISCLOSURE_ITEMS.map((item) => formatPermissionLabel(item.permission));
  const fullText = `Quyền truy cập: ${permissions.join(', ')}; chỉ dùng cho tra cứu từ, lưu cài đặt, và telemetry ẩn danh cục bộ.`;
  return `<span style="display:inline-block;vertical-align:middle;">
    <span title='${fullText.replace(/'/g, '&apos;')}' style="cursor:help;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px;"><path d="M10 2L17 5V10C17 14.4183 13.4183 18 9 18C4.58172 18 1 14.4183 1 10V5L10 2Z" stroke="#888" stroke-width="2" fill="#f6f8fa"/></svg>
    </span>
    <span style="color:#888;font-size:12px;">Quyền truy cập</span>
  </span>`;
}

export function auditManifestPermissions({ permissions = [], hostPermissions = [] } = {}) {
  const declaredByPolicy = new Set(PERMISSION_DISCLOSURE_ITEMS.map((item) => item.permission));
  const runtimePermissions = dedupe([
    ...permissions.map((permission) => normalizePermissionName(permission)),
    ...hostPermissions.map((permission) => normalizeHostPermission(permission)),
  ]);

  const unexpectedPermissions = runtimePermissions.filter((permission) => !declaredByPolicy.has(permission));
  const missingDisclosureItems = [...declaredByPolicy].filter(
    (permission) => !runtimePermissions.includes(permission),
  );

  return {
    isAligned: unexpectedPermissions.length === 0 && missingDisclosureItems.length === 0,
    unexpectedPermissions,
    missingDisclosureItems,
  };
}

export function buildManifestDisclosureAuditReport({ permissions = [], hostPermissions = [] } = {}) {
  const policyPermissions = dedupe(PERMISSION_DISCLOSURE_ITEMS.map((item) => item.permission));
  const runtimePermissions = dedupe([
    ...permissions.map((permission) => normalizePermissionName(permission)),
    ...hostPermissions.map((permission) => normalizeHostPermission(permission)),
  ]);

  const { isAligned, unexpectedPermissions, missingDisclosureItems } = auditManifestPermissions({
    permissions,
    hostPermissions,
  });

  const summary = isAligned
    ? 'Permission/disclosure đã aligned.'
    : 'Permission/disclosure chưa aligned, cần xử lý trước release.';

  return {
    isAligned,
    summary,
    policyPermissions,
    runtimePermissions,
    unexpectedPermissions,
    missingDisclosureItems,
  };
}
