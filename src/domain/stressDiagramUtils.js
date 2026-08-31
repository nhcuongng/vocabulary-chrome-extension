/**
 * English Stress Diagram & Line Notation Utilities
 * Phân tích âm tiết và trực quan hóa sơ đồ trọng âm theo quy ước ngôn ngữ học (Line Notation / Pitch Contour)
 */

export const PITCH_LEVELS = {
  HIGH: 2,
  MID: 1,
  LOW: 0,
};

export const PITCH_CHARS = {
  HIGH: '▔',
  MID: '⎺',
  LOW: '_',
};

/**
 * Trích xuất chuỗi IPA từ chuỗi pronunciation đa định dạng (VD: 'US /ˈfoʊ.t̬ə.ɡræf/ · UK /ˈfəʊ.tə.ɡrɑːf/')
 */
export function extractCleanIpa(pronunciation) {
  if (typeof pronunciation !== 'string' || !pronunciation.trim()) {
    return '';
  }

  const trimmed = pronunciation.trim();

  // 1. Ưu tiên lấy US IPA nếu có
  const usMatch = trimmed.match(/US\s*\/([^/]+)\//i) || trimmed.match(/US\s*\[([^\]]+)\]/i);
  if (usMatch && usMatch[1].trim()) {
    return usMatch[1].trim();
  }

  // 2. Lấy UK IPA nếu không có US
  const ukMatch = trimmed.match(/UK\s*\/([^/]+)\//i) || trimmed.match(/UK\s*\[([^\]]+)\]/i);
  if (ukMatch && ukMatch[1].trim()) {
    return ukMatch[1].trim();
  }

  // 3. Lấy cụm /.../ đầu tiên
  const slashMatch = trimmed.match(/\/([^/]+)\//);
  if (slashMatch && slashMatch[1].trim()) {
    return slashMatch[1].trim();
  }

  // 4. Fallback: loại bỏ tiền tố US/UK và ký tự / [ ] ·
  return trimmed
    .replace(/\b(?:US|UK)\b/gi, '')
    .replace(/[/\[\]·]/g, '')
    .trim();
}

/**
 * Phân tích âm tiết và xác định bậc trọng âm từ chuỗi IPA
 * @param {string} ipaOrPronunciation Chuỗi phiên âm IPA hoặc chuỗi phát âm
 * @returns {object|null} Dữ liệu sơ đồ trọng âm
 */
export function parseStressDiagramFromIpa(ipaOrPronunciation) {
  if (!ipaOrPronunciation || typeof ipaOrPronunciation !== 'string') {
    return null;
  }

  let cleanIpa = extractCleanIpa(ipaOrPronunciation);
  if (!cleanIpa) {
    // Nếu extractCleanIpa trả về rỗng, thử làm sạch trực tiếp
    cleanIpa = ipaOrPronunciation.replace(/[/[\].·]/g, '').trim();
  }

  if (!cleanIpa) {
    return null;
  }

  // Chuẩn hóa ranh giới âm tiết: chèn dấu ngắt '.' trước các dấu trọng âm 'ˈ' hoặc 'ˌ' nếu chưa có
  const normalized = cleanIpa.replace(/([^./\s])([ˈˌ])/g, '$1.$2');

  // Tách các âm tiết theo dấu chấm, khoảng trắng hoặc gạch nối
  const rawTokens = normalized
    .split(/[.\s-]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (rawTokens.length === 0) {
    return null;
  }

  const syllables = rawTokens.map((token, index) => {
    const isPrimary = token.includes('ˈ');
    const isSecondary = token.includes('ˌ');

    let level = PITCH_LEVELS.LOW;
    let levelName = 'Low';
    let lineChar = PITCH_CHARS.LOW;

    if (isPrimary) {
      level = PITCH_LEVELS.HIGH;
      levelName = 'High';
      lineChar = PITCH_CHARS.HIGH;
    } else if (isSecondary) {
      level = PITCH_LEVELS.MID;
      levelName = 'Mid';
      lineChar = PITCH_CHARS.MID;
    } else if (rawTokens.length === 1) {
      // Từ 1 âm tiết mặc định có trọng âm duy nhất (High)
      level = PITCH_LEVELS.HIGH;
      levelName = 'High';
      lineChar = PITCH_CHARS.HIGH;
    }

    const cleanText = token.replace(/[ˈˌ/]/g, '').trim();

    return {
      index,
      rawToken: token,
      text: cleanText || token,
      level,
      levelName,
      lineChar,
      isPrimary,
      isSecondary,
    };
  });

  const patternNotation = syllables.map((s) => s.lineChar).join(' ');
  const primaryIndex = syllables.findIndex((s) => s.level === PITCH_LEVELS.HIGH);
  const effectivePrimaryIndex = primaryIndex !== -1 ? primaryIndex : 0;

  const stressSummary =
    syllables.length <= 1
      ? '1 syllable'
      : `Stress on ${formatOrdinal(effectivePrimaryIndex + 1)} syllable`;

  return {
    rawIpa: cleanIpa,
    syllables,
    syllablesCount: syllables.length,
    patternNotation,
    primaryIndex: effectivePrimaryIndex,
    stressSummary,
    hasStressInfo: true,
  };
}

export function formatOrdinal(n) {
  const num = Math.abs(parseInt(n, 10)) || 1;
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${num}st`;
  }
  if (mod10 === 2 && mod100 !== 12) {
    return `${num}nd`;
  }
  if (mod10 === 3 && mod100 !== 13) {
    return `${num}rd`;
  }
  return `${num}th`;
}

export function generateEqualizerBarsSvg(stressData) {
  if (!stressData || !Array.isArray(stressData.syllables) || stressData.syllables.length === 0) {
    return '';
  }
  const syllables = stressData.syllables;
  const barWidth = 4;
  const barGap = 3;
  const count = syllables.length;
  const totalWidth = count * barWidth + (count - 1) * barGap;
  const totalHeight = 16;

  const bars = syllables
    .map((syl, i) => {
      const x = i * (barWidth + barGap);
      let h = 5;
      let fill = '#9ca3af';
      if (syl.level === PITCH_LEVELS.HIGH) {
        h = 14;
        fill = '#1677C9';
      } else if (syl.level === PITCH_LEVELS.MID) {
        h = 9;
        fill = '#0284c7';
      }
      const y = totalHeight - h;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="2" fill="${fill}" />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" class="vocab-eq-svg">${bars}</svg>`;
}

/**
 * Tạo chuỗi SVG biểu diễn Stepped Line Diagram cho sơ đồ trọng âm
 * @param {object} stressData Dữ liệu từ parseStressDiagramFromIpa
 * @returns {string} Chuỗi SVG
 */
export function generateStressSvg(stressData) {
  if (!stressData || !Array.isArray(stressData.syllables) || stressData.syllables.length === 0) {
    return '';
  }

  const syllables = stressData.syllables;
  const count = syllables.length;
  const colWidth = 56;
  const height = 48;
  const width = Math.max(160, count * colWidth + 20);
  const startX = (width - count * colWidth) / 2;

  // Tọa độ Y tương ứng với từng mức cao độ (High = 10, Mid = 20, Low = 30)
  const getY = (level) => {
    if (level === PITCH_LEVELS.HIGH) return 10;
    if (level === PITCH_LEVELS.MID) return 20;
    return 30;
  };

  let paths = '';
  let syllableTexts = '';

  for (let i = 0; i < count; i++) {
    const syl = syllables[i];
    const x1 = startX + i * colWidth + 6;
    const x2 = startX + (i + 1) * colWidth - 6;
    const y = getY(syl.level);

    const isHigh = syl.level === PITCH_LEVELS.HIGH;
    const isMid = syl.level === PITCH_LEVELS.MID;
    const strokeColor = isHigh ? '#1677C9' : isMid ? '#0284c7' : '#9ca3af';
    const strokeWidth = isHigh ? '3.5' : isMid ? '2.5' : '2';

    // Đường ngang âm tiết
    paths += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" />`;

    // Chấm tròn nhỏ ở đầu vạch âm tiết chính để nhấn mạnh
    if (isHigh) {
      paths += `<circle cx="${(x1 + x2) / 2}" cy="${y}" r="3.5" fill="#1677C9" />`;
    } else if (isMid) {
      paths += `<circle cx="${(x1 + x2) / 2}" cy="${y}" r="2.5" fill="#0284c7" />`;
    }

    // Đường nối bậc thang sang âm tiết tiếp theo
    if (i < count - 1) {
      const nextY = getY(syllables[i + 1].level);
      const nextX1 = startX + (i + 1) * colWidth + 6;
      paths += `<line x1="${x2}" y1="${y}" x2="${nextX1}" y2="${nextY}" stroke="#d1d5db" stroke-width="1.2" stroke-dasharray="2,2" />`;
    }

    // Text âm tiết phía dưới
    const textX = startX + i * colWidth + colWidth / 2;
    const fontWeight = isHigh ? '700' : isMid ? '600' : '400';
    const textColor = isHigh ? '#1677C9' : isMid ? '#0284c7' : 'currentColor';
    syllableTexts += `<text x="${textX}" y="44" text-anchor="middle" font-size="11" font-weight="${fontWeight}" fill="${textColor}">/${syl.text}/</text>`;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="vocab-stress-svg" width="100%" height="${height}">
      <!-- Guide reference lines -->
      <line x1="10" y1="10" x2="${width - 10}" y2="10" stroke="rgba(156, 163, 175, 0.2)" stroke-width="1" stroke-dasharray="3,3" />
      <line x1="10" y1="20" x2="${width - 10}" y2="20" stroke="rgba(156, 163, 175, 0.15)" stroke-width="1" stroke-dasharray="3,3" />
      <line x1="10" y1="30" x2="${width - 10}" y2="30" stroke="rgba(156, 163, 175, 0.2)" stroke-width="1" stroke-dasharray="3,3" />
      ${paths}
      ${syllableTexts}
    </svg>
  `.trim();
}
