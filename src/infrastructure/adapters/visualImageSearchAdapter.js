/**
 * Visual Image Search Adapter
 * Fetches relevant images using DuckDuckGo with automatic fallback to Wikimedia Commons
 */

import { ContextImageSearch } from '../../domain/contextImageSearch.js';

export class VisualImageSearchAdapter {
  constructor({ imageSearchService = new ContextImageSearch() } = {}) {
    this.imageSearchService = imageSearchService;
    this.cache = new Map();
  }

  /**
   * Sanitizes query string
   * @param {string} raw
   * @returns {string}
   */
  cleanQuery(raw) {
    return this.imageSearchService.cleanQuery(raw);
  }

  /**
   * Extracts vqd token from DuckDuckGo response HTML
   * @param {string} html
   * @returns {string|null}
   */
  extractVqdToken(html) {
    if (!html || typeof html !== 'string') return null;
    const match =
      html.match(/vqd=([\'\"])?([0-9-]+)\1/) ||
      html.match(/\"vqd\":\s*\"([0-9-]+)\"/) ||
      html.match(/vqd=([0-9-]+)/);
    return match ? (match[2] || match[1]) : null;
  }

  /**
   * Fetches images directly from DuckDuckGo
   * @param {string} query
   * @param {number} limit
   * @param {typeof fetch} fetchFn
   * @returns {Promise<Array<{ id: string, title: string, thumbUrl: string, fullUrl: string, sourceUrl: string }>>}
   */
  async fetchDuckDuckGoImages(query, limit = 6, fetchFn = globalThis.fetch) {
    // Step 1: Request vqd token
    const tokenUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
    const tokenRes = await fetchFn(tokenUrl, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!tokenRes.ok) {
      throw new Error(`DuckDuckGo token request failed: HTTP ${tokenRes.status}`);
    }

    const html = await tokenRes.text();
    const vqd = this.extractVqdToken(html);
    if (!vqd) {
      throw new Error('Could not extract vqd token from DuckDuckGo');
    }

    // Step 2: Request image results using vqd token
    const searchUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`;
    const searchRes = await fetchFn(searchUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!searchRes.ok) {
      throw new Error(`DuckDuckGo image search failed: HTTP ${searchRes.status}`);
    }

    const data = await searchRes.json();
    const rawResults = Array.isArray(data?.results) ? data.results : [];
    const validImages = [];

    for (let i = 0; i < rawResults.length; i++) {
      const item = rawResults[i];
      const thumbUrl = item?.thumbnail || item?.image;
      const fullUrl = item?.image || item?.thumbnail;
      const sourceUrl = item?.url || item?.image;

      if (thumbUrl && !/\.(svg|ogg|ogv|pdf|webm|mid|midi|tiff?)$/i.test(thumbUrl)) {
        validImages.push({
          id: `ddg-${i + 1}`,
          title: item.title || query,
          thumbUrl,
          fullUrl,
          sourceUrl,
        });
      }

      if (validImages.length >= limit) break;
    }

    return validImages;
  }

  /**
   * Fetches visual images with automatic fallback to Wikimedia Commons
   * @param {string} keyword
   * @param {number} limit
   * @param {typeof fetch} fetchFn
   * @returns {Promise<{ source: 'duckduckgo' | 'wikimedia', images: Array<any> }>}
   */
  async fetchImagesWithFallback(keyword, limit = 6, fetchFn = globalThis.fetch) {
    const query = this.cleanQuery(keyword);
    if (!query) {
      return { source: 'duckduckgo', images: [] };
    }

    if (this.cache.has(query)) {
      return this.cache.get(query);
    }

    // Attempt 1: DuckDuckGo Image Search
    try {
      const ddgImages = await this.fetchDuckDuckGoImages(query, limit, fetchFn);
      if (Array.isArray(ddgImages) && ddgImages.length > 0) {
        const result = { source: 'duckduckgo', images: ddgImages };
        this.cache.set(query, result);
        return result;
      }
    } catch {
      // Fallback to Wikimedia Commons on any DDG error or empty result
    }

    // Attempt 2: Wikimedia Commons Fallback
    try {
      const wikiImages = await this.imageSearchService.fetchImages(query, limit, fetchFn);
      const result = { source: 'wikimedia', images: wikiImages || [] };
      this.cache.set(query, result);
      return result;
    } catch (err) {
      throw new Error(`Visual images search failed across all providers: ${err?.message || String(err)}`);
    }
  }
}

export const defaultVisualImageSearchAdapter = new VisualImageSearchAdapter();
