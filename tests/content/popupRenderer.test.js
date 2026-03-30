import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderErrorContent,
  renderNotFoundContent,
  renderSuccessContent,
} from '../../src/content/popupRenderer.js';

test('popup renderer: success state hiển thị đúng thứ bậc headword -> pronunciation -> definition', () => {
  const content = renderSuccessContent({
    headword: 'hello',
    pronunciation: '/həˈloʊ/',
    definitions: ['A greeting'],
  });

  assert.deepEqual(content.map((item) => item.type), [
    'headword',
    'pronunciation',
    'definition',
    'attribution',
    'permission-disclosure',
  ]);
  assert.equal(content[0].value, 'hello');
  assert.equal(content[1].value, '/həˈloʊ/');
  assert.deepEqual(content[2].value, ['A greeting']);
});

test('popup renderer: not-found state hiển thị message và guidance list', () => {
  const content = renderNotFoundContent({
    title: 'Không tìm thấy kết quả',
    message: 'Không có dữ liệu phù hợp.',
    guidance: ['Chỉ chọn một từ', 'Thử dạng từ gốc'],
  });

  assert.deepEqual(content.map((item) => item.type), [
    'title',
    'message',
    'guidance-list',
    'attribution',
    'permission-disclosure',
  ]);
  assert.equal(content[0].value, 'Không tìm thấy kết quả');
  assert.deepEqual(content[2].value, ['Chỉ chọn một từ', 'Thử dạng từ gốc']);
});

test('popup renderer: error state mapping đúng theo loại lỗi', () => {
  const timeoutContent = renderErrorContent({ type: 'timeout' });
  const parseContent = renderErrorContent({ type: 'parse' });
  const rateLimitContent = renderErrorContent({ type: 'rate-limit' });

  assert.equal(timeoutContent[2].value, 'Thử lại');
  assert.equal(parseContent[2].value, 'Đóng');
  assert.equal(rateLimitContent[2].value, 'Đợi rồi thử lại');
  assert.notEqual(timeoutContent[1].value, parseContent[1].value);
});

test('popup renderer: tương thích với payload chỉ có errorType', () => {
  const timeoutContent = renderErrorContent({ errorType: 'timeout' });

  assert.equal(timeoutContent[2].value, 'Thử lại');
});

test('popup renderer: luôn có attribution và disclosure footer', () => {
  const content = renderErrorContent({ type: 'network' });
  const attribution = content.find((item) => item.type === 'attribution');
  const disclosure = content.find((item) => item.type === 'permission-disclosure');

  assert.ok(attribution);
  assert.match(attribution.value, /Vocabulary\.com/i);

  assert.ok(disclosure);
  assert.match(disclosure.value, /activeTab/i);
});
