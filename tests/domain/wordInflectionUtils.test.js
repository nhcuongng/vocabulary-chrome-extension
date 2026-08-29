import assert from 'node:assert/strict';
import test from 'node:test';

import { isInflectedForm } from '../../src/domain/wordInflectionUtils.js';

test('isInflectedForm: nhận diện chính xác các dạng chia quá khứ / phân từ (-ed, -d, -ied)', () => {
  assert.equal(isInflectedForm('created', 'create'), true);
  assert.equal(isInflectedForm('played', 'play'), true);
  assert.equal(isInflectedForm('studied', 'study'), true);
  assert.equal(isInflectedForm('stopped', 'stop'), true);
  assert.equal(isInflectedForm('applied', 'apply'), true);
  assert.equal(isInflectedForm('watched', 'watch'), true);
});

test('isInflectedForm: nhận diện chính xác các dạng tiếp diễn (-ing)', () => {
  assert.equal(isInflectedForm('creating', 'create'), true);
  assert.equal(isInflectedForm('playing', 'play'), true);
  assert.equal(isInflectedForm('studying', 'study'), true);
  assert.equal(isInflectedForm('running', 'run'), true);
  assert.equal(isInflectedForm('dying', 'die'), true);
  assert.equal(isInflectedForm('watching', 'watch'), true);
});

test('isInflectedForm: nhận diện chính xác các dạng ngôi thứ ba / số nhiều (-s, -es, -ies)', () => {
  assert.equal(isInflectedForm('creates', 'create'), true);
  assert.equal(isInflectedForm('plays', 'play'), true);
  assert.equal(isInflectedForm('watches', 'watch'), true);
  assert.equal(isInflectedForm('studies', 'study'), true);
  assert.equal(isInflectedForm('applies', 'apply'), true);
});

test('isInflectedForm: không đánh dấu các từ phái sinh (derivatives)', () => {
  assert.equal(isInflectedForm('creation', 'create'), false);
  assert.equal(isInflectedForm('creative', 'create'), false);
  assert.equal(isInflectedForm('creativity', 'create'), false);
  assert.equal(isInflectedForm('creator', 'create'), false);
  assert.equal(isInflectedForm('recreate', 'create'), false);

  assert.equal(isInflectedForm('development', 'develop'), false);
  assert.equal(isInflectedForm('developer', 'develop'), false);

  assert.equal(isInflectedForm('happiness', 'happy'), false);
  assert.equal(isInflectedForm('happily', 'happy'), false);

  assert.equal(isInflectedForm('application', 'apply'), false);
  assert.equal(isInflectedForm('applicant', 'apply'), false);
  assert.equal(isInflectedForm('applicable', 'apply'), false);
});

test('isInflectedForm: an toàn khi input rỗng hoặc trùng lặp', () => {
  assert.equal(isInflectedForm('', 'create'), false);
  assert.equal(isInflectedForm('create', 'create'), false);
  assert.equal(isInflectedForm('create', ''), false);
  assert.equal(isInflectedForm(null, 'create'), false);
});
