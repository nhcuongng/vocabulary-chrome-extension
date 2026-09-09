/**
 * Part of Speech (POS) Utility Module
 * Standardizes part-of-speech identifiers, generates color-coded chip badges,
 * and intercepts raw dictionary HTML to transform POS labels into chips.
 */

export const POS_TYPES = Object.freeze({
  NOUN: { id: 'noun', label: 'Noun' },
  VERB: { id: 'verb', label: 'Verb' },
  ADJECTIVE: { id: 'adjective', label: 'Adjective' },
  ADVERB: { id: 'adverb', label: 'Adverb' },
  PRONOUN: { id: 'pronoun', label: 'Pronoun' },
  PREPOSITION: { id: 'preposition', label: 'Preposition' },
  CONJUNCTION: { id: 'conjunction', label: 'Conjunction' },
  INTERJECTION: { id: 'interjection', label: 'Interjection' },
  PHRASE: { id: 'phrase', label: 'Phrase' },
  IDIOM: { id: 'idiom', label: 'Idiom' },
  OTHER: { id: 'other', label: 'Other' },
});

/**
 * Normalizes any POS string (e.g. 'noun', 'n.', 'v.', 'verb', 'adjective', 'adj.', etc.)
 * into a standard POS descriptor.
 * @param {string} posStr
 * @returns {{ id: string, label: string } | null}
 */
export function normalizePartOfSpeech(posStr) {
  if (!posStr || typeof posStr !== 'string') return null;

  const raw = posStr.trim().toLowerCase().replace(/[:()[\]]/g, '').trim();
  if (!raw) return null;

  if (raw === 'n' || raw === 'n.' || raw === 'noun' || raw === 'nouns') {
    return POS_TYPES.NOUN;
  }
  if (raw === 'v' || raw === 'v.' || raw === 'verb' || raw === 'verbs' || raw === 'vi' || raw === 'vt' || raw === 'vi.' || raw === 'vt.') {
    return POS_TYPES.VERB;
  }
  if (raw === 'adj' || raw === 'adj.' || raw === 'adjective' || raw === 'adjectives') {
    return POS_TYPES.ADJECTIVE;
  }
  if (raw === 'adv' || raw === 'adv.' || raw === 'adverb' || raw === 'adverbs') {
    return POS_TYPES.ADVERB;
  }
  if (raw === 'pron' || raw === 'pron.' || raw === 'pronoun' || raw === 'pronouns') {
    return POS_TYPES.PRONOUN;
  }
  if (raw === 'prep' || raw === 'prep.' || raw === 'preposition' || raw === 'prepositions') {
    return POS_TYPES.PREPOSITION;
  }
  if (raw === 'conj' || raw === 'conj.' || raw === 'conjunction' || raw === 'conjunctions') {
    return POS_TYPES.CONJUNCTION;
  }
  if (raw === 'interj' || raw === 'interj.' || raw === 'interjection' || raw === 'interjections') {
    return POS_TYPES.INTERJECTION;
  }
  if (raw === 'phr' || raw === 'phr.' || raw === 'phrase' || raw === 'phrases') {
    return POS_TYPES.PHRASE;
  }
  if (raw === 'idiom' || raw === 'idioms') {
    return POS_TYPES.IDIOM;
  }

  // Fallback for custom or capitalized single-word POS
  const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
  return {
    id: raw.replace(/[^a-z0-9-]/g, '-'),
    label: capitalized,
  };
}

/**
 * Renders an HTML string for a POS chip badge.
 * @param {string|{id: string, label: string}} posInput
 * @returns {string}
 */
export function renderPosChipHtml(posInput) {
  if (!posInput) return '';

  const posObj = typeof posInput === 'object' && posInput.id && posInput.label
    ? posInput
    : normalizePartOfSpeech(String(posInput));

  if (!posObj) return '';

  return `<span class="vocab-pos-chip vocab-pos-${posObj.id}">${posObj.label}</span>`;
}

/**
 * Intercepts and transforms Part-of-Speech representations in raw HTML
 * into stylized POS chip badges.
 * @param {string} html
 * @returns {string}
 */
export function interceptPosInHtml(html) {
  if (typeof html !== 'string' || !html.trim()) {
    return html;
  }

  let transformed = html;

  // 1. Intercept <a class="pos"...>...</a> or <span class="pos"...>...</span>
  transformed = transformed.replace(
    /<(?:a|span)[^>]*class=["'][^"']*\bpos\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|span)>/gi,
    (_match, content) => {
      const cleanText = content.replace(/<[^>]*>/g, '').trim();
      const posObj = normalizePartOfSpeech(cleanText);
      return posObj ? renderPosChipHtml(posObj) : _match;
    }
  );

  // 2. Intercept <b>(Noun|Verb|...):?</b> or <strong>Noun:</strong> (standalone POS in b/strong)
  transformed = transformed.replace(
    /<(?:b|strong)>\s*(?:\(?\s*)?(noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|phrase|idiom|adj\.?|adv\.?|n\.?|v\.?|prep\.?|pron\.?|conj\.?|interj\.?)\s*(?:\)?\s*)?:?\s*<\/(?:b|strong)>:?/gi,
    (_match, posGroup) => {
      const posObj = normalizePartOfSpeech(posGroup);
      return posObj ? `${renderPosChipHtml(posObj)} ` : _match;
    }
  );

  // 3. Intercept <b>verb attain success...</b> or <strong>noun a person...</strong> (POS word at start of bold text)
  transformed = transformed.replace(
    /<(b|strong)>\s*(noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|phrase|idiom|adj\.?|adv\.?|n\.?|v\.?)\b(?:\s*:)?\s+([\s\S]*?)<\/\1>/gi,
    (_match, tag, posGroup, restText) => {
      const posObj = normalizePartOfSpeech(posGroup);
      return posObj ? `${renderPosChipHtml(posObj)} <${tag}>${restText.trim()}</${tag}>` : _match;
    }
  );

  // 4. Intercept standalone parenthesized POS like (noun), (verb), (adj.), (adv.) at start of paragraphs or after tags
  transformed = transformed.replace(
    /(^|>|\s)\((noun|verb|adjective|adverb|pronoun|preposition|conjunction|interjection|phrase|idiom|adj\.?|adv\.?|n\.?|v\.?|prep\.?|pron\.?|conj\.?|interj\.?)\)\s*/gi,
    (_match, prefix, posGroup) => {
      const posObj = normalizePartOfSpeech(posGroup);
      return posObj ? `${prefix}${renderPosChipHtml(posObj)} ` : _match;
    }
  );

  // 5. Intercept "Noun: ", "Verb: " at beginning of list items or paragraphs
  transformed = transformed.replace(
    /(<li[^>]*>|<p[^>]*>)\s*(Noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Interjection|Phrase|Idiom):\s*/gi,
    (_match, tag, posGroup) => {
      const posObj = normalizePartOfSpeech(posGroup);
      return posObj ? `${tag}${renderPosChipHtml(posObj)} ` : _match;
    }
  );

  return transformed;
}
