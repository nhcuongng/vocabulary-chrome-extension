import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseStressDiagramFromIpa,
  extractCleanIpa,
  generateStressSvg,
  generateEqualizerBarsSvg,
  formatOrdinal,
  PITCH_LEVELS,
} from '../../src/domain/stressDiagramUtils.js';

test('extractCleanIpa: trích xuất chính xác IPA từ chuỗi phát âm đa định dạng', () => {
  // US + UK format
  const combined = 'US /ˈfoʊ.t̬ə.ɡræf/ · UK /ˈfəʊ.tə.ɡrɑːf/';
  assert.equal(extractCleanIpa(combined), 'ˈfoʊ.t̬ə.ɡræf');

  // Single slash format
  assert.equal(extractCleanIpa('/fəˈtɑː.ɡrə.fi/'), 'fəˈtɑː.ɡrə.fi');

  // Raw format without slashes
  assert.equal(extractCleanIpa('ˌfoʊ.t̬əˈɡræf.ɪk'), 'ˌfoʊ.t̬əˈɡræf.ɪk');

  // Empty or invalid
  assert.equal(extractCleanIpa(''), '');
  assert.equal(extractCleanIpa(null), '');
});

test('parseStressDiagramFromIpa: từ 3 âm tiết có trọng âm chính ở đầu (photograph)', () => {
  const result = parseStressDiagramFromIpa('/ˈfoʊ.t̬ə.ɡræf/');

  assert.ok(result);
  assert.equal(result.syllablesCount, 3);
  assert.equal(result.patternNotation, '▔ _ _');
  assert.equal(result.primaryIndex, 0);

  assert.equal(result.syllables[0].text, 'foʊ');
  assert.equal(result.syllables[0].level, PITCH_LEVELS.HIGH);
  assert.equal(result.syllables[0].isPrimary, true);

  assert.equal(result.syllables[1].text, 't̬ə');
  assert.equal(result.syllables[1].level, PITCH_LEVELS.LOW);
  assert.equal(result.syllables[1].isPrimary, false);

  assert.equal(result.syllables[2].text, 'ɡræf');
  assert.equal(result.syllables[2].level, PITCH_LEVELS.LOW);
});

test('parseStressDiagramFromIpa: từ 4 âm tiết có trọng âm chính ở âm tiết thứ 2 (photography)', () => {
  const result = parseStressDiagramFromIpa('US /fəˈtɑː.ɡrə.fi/');

  assert.ok(result);
  assert.equal(result.syllablesCount, 4);
  assert.equal(result.patternNotation, '_ ▔ _ _');
  assert.equal(result.primaryIndex, 1);

  assert.equal(result.syllables[0].level, PITCH_LEVELS.LOW);
  assert.equal(result.syllables[1].level, PITCH_LEVELS.HIGH);
  assert.equal(result.syllables[2].level, PITCH_LEVELS.LOW);
  assert.equal(result.syllables[3].level, PITCH_LEVELS.LOW);
});

test('parseStressDiagramFromIpa: từ có cả trọng âm phụ và chính (photographic, information)', () => {
  const result = parseStressDiagramFromIpa('/ˌfoʊ.t̬əˈɡræf.ɪk/');

  assert.ok(result);
  assert.equal(result.syllablesCount, 4);
  assert.equal(result.patternNotation, '⎺ _ ▔ _');
  assert.equal(result.syllables[0].level, PITCH_LEVELS.MID);
  assert.equal(result.syllables[0].isSecondary, true);
  assert.equal(result.syllables[1].level, PITCH_LEVELS.LOW);
  assert.equal(result.syllables[2].level, PITCH_LEVELS.HIGH);
  assert.equal(result.syllables[2].isPrimary, true);
  assert.equal(result.syllables[3].level, PITCH_LEVELS.LOW);
});

test('parseStressDiagramFromIpa: từ 1 âm tiết (cat, word)', () => {
  const result1 = parseStressDiagramFromIpa('/kæt/');
  assert.ok(result1);
  assert.equal(result1.syllablesCount, 1);
  assert.equal(result1.patternNotation, '▔');
  assert.equal(result1.syllables[0].level, PITCH_LEVELS.HIGH);

  const result2 = parseStressDiagramFromIpa('/ˈwɜːd/');
  assert.ok(result2);
  assert.equal(result2.syllablesCount, 1);
  assert.equal(result2.patternNotation, '▔');
});

test('parseStressDiagramFromIpa: an toàn khi input rỗng hoặc không hợp lệ', () => {
  assert.equal(parseStressDiagramFromIpa(''), null);
  assert.equal(parseStressDiagramFromIpa(null), null);
  assert.equal(parseStressDiagramFromIpa(undefined), null);
});

test('generateStressSvg: tạo chuỗi SVG hợp lệ chứa đường kẻ và text âm tiết', () => {
  const data = parseStressDiagramFromIpa('/ˈfoʊ.t̬ə.ɡræf/');
  const svg = generateStressSvg(data);

  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('class="vocab-stress-svg"'));
  assert.ok(svg.includes('/foʊ/'));
  assert.ok(svg.includes('/t̬ə/'));
  assert.ok(svg.includes('/ɡræf/'));
  assert.ok(svg.includes('stroke="#1677C9"')); // High level primary color
});

test('formatOrdinal & generateEqualizerBarsSvg: sinh ordinal chính xác và SVG Equalizer mini', () => {
  const data = parseStressDiagramFromIpa('/loʊˈkeɪ.ʃən/');
  assert.ok(data);
  assert.equal(data.syllablesCount, 3);
  assert.equal(data.primaryIndex, 1);
  assert.equal(data.stressSummary, 'Stress on 2nd syllable');

  const eqSvg = generateEqualizerBarsSvg(data);
  assert.ok(eqSvg.startsWith('<svg'));
  assert.ok(eqSvg.includes('class="vocab-eq-svg"'));
  assert.ok(eqSvg.includes('fill="#1677C9"')); // High level bar
  assert.ok(eqSvg.includes('fill="#9ca3af"')); // Low level bar
});
