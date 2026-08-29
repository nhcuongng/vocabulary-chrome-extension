import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCambridgeHtml } from '../../src/infrastructure/adapters/cambridgeHtmlParserAdapter.js';

test('cambridge parser adapter: trích xuất headword, UK & US IPA pronunciation, audio URLs, definitions từ Cambridge HTML', () => {
  const html = `
    <div class="pr entry-body__el">
      <div class="pos-header dpos-h">
        <span class="hw dhw">test</span>
        <span class="pos dpos">noun</span>
        <span class="gram dgram">[ C or U ]</span>
        <span class="uk dpron-i">
          <span class="ipa dipa lpr-2 lpl-1">test</span>
          <audio id="audio1">
            <source type="audio/mpeg" src="/media/english/uk_pron/u/ukt/ukte_/uktest_023.mp3" />
          </audio>
        </span>
        <span class="us dpron-i">
          <span class="ipa dipa lpr-2 lpl-1">test</span>
          <audio id="audio2">
            <source type="audio/mpeg" src="/media/english/us_pron/t/tes/test_/test.mp3" />
          </audio>
        </span>
      </div>
      <div class="def-block ddef_block">
        <span class="guideword dsense_gw"><span>EXAMINATION</span></span>
        <div class="def ddef_d db">a way of discovering, by questions or practical activities, something:</div>
        <div class="examp dexamp"><span class="eg deg">a history test</span></div>
        <div class="examp dexamp"><span class="eg deg">an eye test</span></div>
      </div>
      <span class="inf-group">
        <span class="inf-letter">plural</span>
        <b class="inf-word">tests</b>
      </span>
    </div>
  `;

  const parsed = parseCambridgeHtml(html);

  assert.equal(parsed.headword, 'test');
  assert.equal(parsed.pronunciation, 'US /test/ · UK /test/');
  assert.equal(parsed.audio.uk, 'https://dictionary.cambridge.org/media/english/uk_pron/u/ukt/ukte_/uktest_023.mp3');
  assert.equal(parsed.audio.us, 'https://dictionary.cambridge.org/media/english/us_pron/t/tes/test_/test.mp3');
  assert.equal(parsed.hasCoreData, true);
  assert.equal(parsed.source, 'cambridge');

  assert.ok(parsed.definitions.length > 0);
  const defContent = parsed.definitions[0];
  assert.ok(defContent.includes('noun'));
  assert.ok(defContent.includes('a way of discovering, by questions or practical activities, something'));
  assert.ok(defContent.includes('EXAMINATION'));
  assert.ok(defContent.includes('a history test'));

  assert.ok(Array.isArray(parsed.wordFamily));
  assert.ok(parsed.wordFamily.some((w) => w.word === 'tests'));
});

test('cambridge parser adapter: xử lý HTML verb entry và multiple definitions', () => {
  const html = `
    <div class="pos-header dpos-h">
      <span class="hw dhw">run</span>
      <span class="pos dpos">verb</span>
      <span class="us dpron-i">
        <span class="ipa dipa">rʌn</span>
        <audio src="https://dictionary.cambridge.org/media/english/us_pron/r/run/run.mp3"></audio>
      </span>
    </div>
    <div class="def-block ddef_block">
      <div class="def ddef_d db">to move along, faster than walking:</div>
      <div class="examp dexamp"><span class="eg deg">I ran all the way home.</span></div>
    </div>
  `;

  const parsed = parseCambridgeHtml(html);

  assert.equal(parsed.headword, 'run');
  assert.equal(parsed.pronunciation, 'US /rʌn/');
  assert.equal(parsed.audio.us, 'https://dictionary.cambridge.org/media/english/us_pron/r/run/run.mp3');
  assert.equal(parsed.hasCoreData, true);
  assert.ok(parsed.definitions.some((d) => d.includes('to move along, faster than walking')));
});

test('cambridge parser adapter: trả về rỗng an toàn khi html không hợp lệ', () => {
  const parsed = parseCambridgeHtml('<div>No dictionary entry found</div>');

  assert.equal(parsed.headword, '');
  assert.equal(parsed.pronunciation, '');
  assert.deepEqual(parsed.definitions, []);
  assert.equal(parsed.hasCoreData, false);
});
