/**
 * Renderer for Standalone Toolbar Popup Zero-State (Idle / Initial View)
 */

export const DEFAULT_MICRO_TIPS = [
  '💡 Tip: Select any English word on web pages to look up instantly!',
  '🔊 Tip: Click the speaker icon to hear UK/US pronunciation.',
  '✨ Tip: Click the history chips at the top to quickly review previously looked-up words.',
  '⚙️ Tip: You can adjust dictionary source priority in the settings menu.',
];

/**
 * Creates DOM Element for Zero-State view
 *
 * @param {Object} params
 * @param {Document} [params.documentObj]
 * @param {string[]} [params.historyWords]
 * @param {number} [params.currentWordIndex]
 * @param {Function} [params.onSelectWord]
 * @param {Function} [params.onShuffleWord]
 * @param {string[]} [params.tips]
 * @returns {HTMLElement}
 */
export function createZeroStateElement({
  documentObj = globalThis.document,
  historyWords = [],
  currentWordIndex = 0,
  onSelectWord,
  onShuffleWord,
  tips = DEFAULT_MICRO_TIPS,
} = {}) {
  const container = documentObj.createElement('div');
  container.className = 'vocab-zero-state';

  const validHistory = Array.isArray(historyWords) ? historyWords.filter(Boolean) : [];

  if (validHistory.length > 0) {
    const safeIndex = Math.abs(currentWordIndex) % validHistory.length;
    const currentWord = validHistory[safeIndex];

    const card = documentObj.createElement('div');
    card.className = 'vocab-zero-state-card vocab-quick-review-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View details for ${currentWord}`);

    // Header row with Badge and Shuffle button
    const headerRow = documentObj.createElement('div');
    headerRow.className = 'vocab-zero-state-header-row';

    const badge = documentObj.createElement('span');
    badge.className = 'vocab-zero-state-badge';
    badge.textContent = '✨ From Your History';
    headerRow.appendChild(badge);

    if (validHistory.length > 1) {
      const shuffleBtn = documentObj.createElement('button');
      shuffleBtn.type = 'button';
      shuffleBtn.className = 'vocab-zero-state-shuffle-btn';
      shuffleBtn.setAttribute('title', 'Show another word from your history');
      shuffleBtn.setAttribute('aria-label', 'Show another word from your history');
      shuffleBtn.textContent = '🔀';

      shuffleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onShuffleWord === 'function') {
          onShuffleWord();
        }
      });
      headerRow.appendChild(shuffleBtn);
    }
    card.appendChild(headerRow);

    // Word display
    const wordEl = documentObj.createElement('div');
    wordEl.className = 'vocab-zero-state-word';
    wordEl.textContent = currentWord;
    card.appendChild(wordEl);

    // CTA hint
    const hintEl = documentObj.createElement('div');
    hintEl.className = 'vocab-zero-state-cta-hint';
    hintEl.textContent = 'Click to recall this word ➔';
    card.appendChild(hintEl);

    // Handle click / keydown on card
    const handleSelect = () => {
      if (typeof onSelectWord === 'function') {
        onSelectWord(currentWord);
      }
    };
    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });

    container.appendChild(card);
  } else {
    // First-time onboarding card
    const onboardingCard = documentObj.createElement('div');
    onboardingCard.className = 'vocab-zero-state-card vocab-onboarding-card';

    const titleEl = documentObj.createElement('div');
    titleEl.className = 'vocab-onboarding-title';
    titleEl.textContent = '👋 Your personal vocabulary assistant';
    onboardingCard.appendChild(titleEl);

    const descEl = documentObj.createElement('div');
    descEl.className = 'vocab-onboarding-desc';
    descEl.textContent = 'Get started in 3 easy steps:';
    onboardingCard.appendChild(descEl);

    const stepsList = documentObj.createElement('div');
    stepsList.className = 'vocab-onboarding-steps';

    const stepItems = [
      { icon: '🖱️', text: 'Select any English word while reading articles or documents.' },
      { icon: '⚡', text: 'Search any word in the box above for instant definitions and examples.' },
      { icon: '🔊', text: 'Listen to native pronunciation and see syllable stress patterns.' },
    ];

    stepItems.forEach((item) => {
      const stepRow = documentObj.createElement('div');
      stepRow.className = 'vocab-onboarding-step-row';

      const icon = documentObj.createElement('span');
      icon.className = 'vocab-onboarding-step-icon';
      icon.textContent = item.icon;
      stepRow.appendChild(icon);

      const text = documentObj.createElement('span');
      text.className = 'vocab-onboarding-step-text';
      text.textContent = item.text;
      stepRow.appendChild(text);

      stepsList.appendChild(stepRow);
    });

    onboardingCard.appendChild(stepsList);
    container.appendChild(onboardingCard);
  }

  // Micro-tips banner
  if (Array.isArray(tips) && tips.length > 0) {
    const tipIndex = Math.floor(Math.random() * tips.length);
    const tipEl = documentObj.createElement('div');
    tipEl.className = 'vocab-micro-tips-banner';
    tipEl.textContent = tips[tipIndex];
    container.appendChild(tipEl);
  }

  return container;
}
