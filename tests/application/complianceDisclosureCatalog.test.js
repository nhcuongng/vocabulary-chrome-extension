import assert from 'node:assert/strict';
import test from 'node:test';

import {
  auditManifestPermissions,
  buildManifestDisclosureAuditReport,
  buildAttributionText,
  buildPermissionDisclosureSummary,
} from '../../src/application/complianceDisclosureCatalog.js';

test('compliance catalog: attribution text rõ ràng và có nguồn dữ liệu', () => {
  const vocabAttribution = buildAttributionText('vocabulary');
  assert.match(vocabAttribution, /Data source:/i);
  assert.match(vocabAttribution, /Vocabulary\.com/i);
  assert.match(vocabAttribution, /https:\/\/www\.vocabulary\.com\//i);

  const cambridgeAttribution = buildAttributionText('cambridge');
  assert.match(cambridgeAttribution, /Data source:/i);
  assert.match(cambridgeAttribution, /Cambridge Dictionary/i);
  assert.match(cambridgeAttribution, /https:\/\/dictionary\.cambridge\.org\//i);
});

test('compliance catalog: disclosure summary nêu đúng mục đích quyền truy cập', () => {
  const disclosure = buildPermissionDisclosureSummary();

  assert.match(disclosure, /activeTab/i);
  assert.match(disclosure, /scripting/i);
  assert.match(disclosure, /host:https:\/\/www\.vocabulary\.com\/\*/i);
  assert.match(disclosure, /host:https:\/\/dictionary\.cambridge\.org\/\*/i);
  assert.match(disclosure, /storage/i);
  assert.match(disclosure, /anonymous telemetry/i);
});

test('compliance catalog: audit phát hiện quyền dư thừa không có disclosure', () => {
  const aligned = auditManifestPermissions({
    permissions: ['activeTab', 'scripting', 'storage', 'declarativeNetRequest'],
    hostPermissions: [
      'https://www.vocabulary.com/*',
      'https://dictionary.cambridge.org/*',
      'https://api.dictionaryapi.dev/*',
      'https://translate.google.com/*',
    ],
  });

  const misaligned = auditManifestPermissions({
    permissions: ['activeTab', 'storage', 'tabs'],
    hostPermissions: ['https://www.vocabulary.com/*'],
  });

  assert.equal(aligned.isAligned, true);
  assert.deepEqual(aligned.unexpectedPermissions, []);

  assert.equal(misaligned.isAligned, false);
  assert.deepEqual(misaligned.unexpectedPermissions, ['tabs']);
  assert.ok(misaligned.missingDisclosureItems.includes('scripting'));
  assert.ok(misaligned.missingDisclosureItems.includes('host:https://dictionary.cambridge.org/*'));
});

test('compliance catalog: thiếu disclosure item cũng phải fail alignment', () => {
  const result = auditManifestPermissions({
    permissions: ['activeTab', 'storage'],
    hostPermissions: ['https://www.vocabulary.com/*'],
  });

  assert.equal(result.isAligned, false);
  assert.deepEqual(result.unexpectedPermissions, []);
  assert.ok(result.missingDisclosureItems.includes('scripting'));
  assert.ok(result.missingDisclosureItems.includes('host:https://dictionary.cambridge.org/*'));
});

test('compliance catalog: build report trả về đầy đủ thông tin release review', () => {
  const alignedReport = buildManifestDisclosureAuditReport({
    permissions: ['activeTab', 'scripting', 'storage', 'declarativeNetRequest'],
    hostPermissions: [
      'https://www.vocabulary.com/*',
      'https://dictionary.cambridge.org/*',
      'https://api.dictionaryapi.dev/*',
      'https://translate.google.com/*',
    ],
  });

  assert.equal(alignedReport.isAligned, true);
  assert.equal(alignedReport.unexpectedPermissions.length, 0);
  assert.equal(alignedReport.missingDisclosureItems.length, 0);
  assert.ok(alignedReport.policyPermissions.includes('host:https://www.vocabulary.com/*'));
  assert.ok(alignedReport.policyPermissions.includes('host:https://dictionary.cambridge.org/*'));
  assert.ok(alignedReport.runtimePermissions.includes('host:https://www.vocabulary.com/*'));
  assert.ok(alignedReport.runtimePermissions.includes('host:https://dictionary.cambridge.org/*'));
  assert.match(alignedReport.summary, /aligned/i);

  const misalignedReport = buildManifestDisclosureAuditReport({
    permissions: ['activeTab', 'tabs'],
    hostPermissions: [],
  });

  assert.equal(misalignedReport.isAligned, false);
  assert.deepEqual(misalignedReport.unexpectedPermissions, ['tabs']);
  assert.ok(misalignedReport.missingDisclosureItems.includes('scripting'));
  assert.match(misalignedReport.summary, /not aligned/i);
});
