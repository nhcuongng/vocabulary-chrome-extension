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
    'compliance-footer',
  ]);
  assert.equal(content[0].value, 'hello');
  assert.equal(content[1].value, '/həˈloʊ/');
  assert.deepEqual(content[2].value, ['A greeting']);
});

test('popup renderer: not-found state hiển thị message, search suggestions và guidance list', () => {
  const content = renderNotFoundContent({
    title: 'Không tìm thấy kết quả',
    message: 'Không có dữ liệu phù hợp.',
    searchSuggestions: 'Thử tìm tại: Google',
    guidance: ['Chỉ chọn một từ', 'Thử dạng từ gốc'],
  });

  assert.deepEqual(content.map((item) => item.type), [
    'title',
    'message',
    'searchSuggestions',
    'guidance-list',
    'compliance-footer',
  ]);
  assert.equal(content[0].value, 'Không tìm thấy kết quả');
  assert.equal(content[2].value, 'Thử tìm tại: Google');
  assert.deepEqual(content[3].value, ['Chỉ chọn một từ', 'Thử dạng từ gốc']);
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

test('popup renderer: luôn có compliance footer', () => {
  const content = renderErrorContent({ type: 'network' });
  const footer = content.find((item) => item.type === 'compliance-footer');

  assert.ok(footer);
  assert.match(footer.value.attribution, /Vocabulary\.com/i);
  assert.match(footer.value.disclosure, /activeTab/i);
});
