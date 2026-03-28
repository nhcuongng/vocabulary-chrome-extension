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

export function buildAttributionText() {
  return `${DATA_SOURCE_ATTRIBUTION.policyLabel}: ${DATA_SOURCE_ATTRIBUTION.providerName} (${DATA_SOURCE_ATTRIBUTION.providerUrl})`;
}

export function buildPermissionDisclosureSummary() {
  const permissions = PERMISSION_DISCLOSURE_ITEMS.map((item) => formatPermissionLabel(item.permission));
  return `Quyền truy cập: ${permissions.join(', ')}; chỉ dùng cho tra cứu từ, lưu cài đặt, và telemetry ẩn danh cục bộ.`;
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
