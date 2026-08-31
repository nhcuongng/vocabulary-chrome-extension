export const DATA_SOURCE_ATTRIBUTION = {
  providerName: 'Vocabulary.com',
  providerUrl: 'https://www.vocabulary.com/',
  policyLabel: 'Reference data source',
};

export const PERMISSION_DISCLOSURE_ITEMS = [
  {
    permission: 'activeTab',
    rationale: 'Only read the word you actively select on the current tab to initiate lookup.',
  },
  {
    permission: 'scripting',
    rationale: 'Inject content script into the active tab to capture selection and display popup.',
  },
  {
    permission: 'storage',
    rationale: 'Save auto-popup settings and anonymous telemetry locally in the browser.',
  },
  {
    permission: 'declarativeNetRequest',
    rationale: 'Modify request headers to enable native audio pronunciation playback from Google Translate TTS.',
  },
  {
    permission: 'host:https://www.vocabulary.com/*',
    rationale: 'Send lookup requests and retrieve definitions from Vocabulary.com.',
  },
  {
    permission: 'host:https://dictionary.cambridge.org/*',
    rationale: 'Send lookup requests and retrieve definitions from Cambridge Dictionary.',
  },
  {
    permission: 'host:https://api.dictionaryapi.dev/*',
    rationale: 'Lookup definitions and pronunciations from Free Dictionary API.',
  },
  {
    permission: 'host:https://translate.google.com/*',
    rationale: 'Native English audio pronunciation (US/UK).',
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
export function buildAttributionText(source = 'vocabulary') {
  const isCambridge = source === 'cambridge';
  const isFreeDictionary = source === 'freedictionary';
  
  let providerName = 'Vocabulary.com';
  let providerUrl = 'https://www.vocabulary.com/';
  
  if (isCambridge) {
    providerName = 'Cambridge Dictionary';
    providerUrl = 'https://dictionary.cambridge.org/';
  } else if (isFreeDictionary) {
    providerName = 'Free Dictionary API';
    providerUrl = 'https://dictionaryapi.dev/';
  }

  return `<span style="display:inline-block;vertical-align:middle;">
    <span title='Data source: ${providerName} (${providerUrl})' style="cursor:help;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px;"><circle cx="10" cy="10" r="9" stroke="#888" stroke-width="2" fill="#f6f8fa"/><text x="10" y="15" text-anchor="middle" font-size="12" fill="#888" font-family="Arial, sans-serif">i</text></svg>
    </span>
    <span style="color:#888;font-size:12px;">${providerName}</span>
  </span>`;
}

// Permission disclosure with icon and hover for full text
export function buildPermissionDisclosureSummary() {
  const permissions = PERMISSION_DISCLOSURE_ITEMS.map((item) => formatPermissionLabel(item.permission));
  const fullText = `Permissions: ${permissions.join(', ')}; used only for word lookup, saving settings, and local anonymous telemetry.`;
  return `<span style="display:inline-block;vertical-align:middle;">
    <span title='${fullText.replace(/'/g, '&apos;')}' style="cursor:help;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:4px;"><path d="M10 2L17 5V10C17 14.4183 13.4183 18 9 18C4.58172 18 1 14.4183 1 10V5L10 2Z" stroke="#888" stroke-width="2" fill="#f6f8fa"/></svg>
    </span>
    <span style="color:#888;font-size:12px;">Permissions</span>
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
    ? 'Permissions/disclosure aligned.'
    : 'Permissions/disclosure not aligned, needs resolution before release.';

  return {
    isAligned,
    summary,
    policyPermissions,
    runtimePermissions,
    unexpectedPermissions,
    missingDisclosureItems,
  };
}
