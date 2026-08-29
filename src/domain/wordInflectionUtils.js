/**
 * Kiểm tra xem một từ trong Word Family có phải là dạng chia từ / biến thể ngữ pháp
 * thông thường (-ed, -ing, -s, -es, -ies, -d...) của headword hay không.
 *
 * @param {string} candidateWord - Từ cần kiểm tra
 * @param {string} headword - Từ gốc đang tra cứu
 * @returns {boolean} true nếu là dạng chia từ, false nếu là từ phái sinh hoặc từ khác
 */
export function isInflectedForm(candidateWord, headword = '') {
  if (!candidateWord || typeof candidateWord !== 'string') return false;
  const w = candidateWord.trim().toLowerCase();
  const h = (headword || '').trim().toLowerCase();

  if (!w || !h || w === h) return false;

  // 1. Direct inflection checks based on headword:

  // a. Quá khứ / Phân từ (-ed, -d, -ied, nhân đôi phụ âm + ed)
  // create -> created, play -> played, study -> studied, stop -> stopped, fit -> fitted
  if (
    w === h + 'ed' ||
    w === h + 'd' ||
    (h.endsWith('e') && w === h + 'd') ||
    (h.endsWith('y') && w === h.slice(0, -1) + 'ied') ||
    (h.length >= 3 && w === h + h[h.length - 1] + 'ed')
  ) {
    return true;
  }

  // b. Hiện tại phân từ / Danh động từ (-ing, bỏ e + ing, -ie -> -ying, nhân đôi phụ âm + ing)
  // play -> playing, create -> creating, die -> dying, run -> running
  if (
    w === h + 'ing' ||
    (h.endsWith('e') && w === h.slice(0, -1) + 'ing') ||
    (h.endsWith('ie') && w === h.slice(0, -2) + 'ying') ||
    (h.length >= 3 && w === h + h[h.length - 1] + 'ing')
  ) {
    return true;
  }

  // c. Ngôi thứ 3 số ít / Số nhiều (-s, -es, -ies)
  // play -> plays, create -> creates, watch -> watches, study -> studies
  if (
    w === h + 's' ||
    w === h + 'es' ||
    (h.endsWith('y') && w === h.slice(0, -1) + 'ies')
  ) {
    return true;
  }

  // 2. Fuzzy stem matching:
  // Nếu từ chia sẻ tiền tố với headword, kiểm tra xem có phải đuôi chia từ không
  const minStemLen = Math.min(3, h.length);
  const stem = h.slice(0, minStemLen);

  if (w.startsWith(stem)) {
    // Loại trừ các hậu tố phái sinh danh từ / tính từ / trạng từ thực thụ
    const derivativeSuffixes = [
      'ness', 'less', 'ous', 'tion', 'sion', 'tive', 'sive', 'tor', 'sor',
      'ity', 'able', 'ible', 'ment', 'ism', 'ist', 'ship', 'hood', 'ful',
      'al', 'ic', 'ical', 'ize', 'ise', 'ify', 'ate', 'ly'
    ];

    for (const suffix of derivativeSuffixes) {
      if (w.endsWith(suffix) && !h.endsWith(suffix)) {
        return false;
      }
    }

    if (w.endsWith('ing') && w.length <= h.length + 4) {
      return true;
    }
    if (w.endsWith('ed') && w.length <= h.length + 3) {
      return true;
    }
    if (w.endsWith('es') && w.length <= h.length + 3) {
      return true;
    }
    if (w.endsWith('s') && w.length <= h.length + 2) {
      return true;
    }
  }

  return false;
}
