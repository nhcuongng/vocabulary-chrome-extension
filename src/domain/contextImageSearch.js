/**
 * Context Image Search Service
 * Searches for visual context images using Wikimedia Commons API
 */

export class ContextImageSearch {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Sanitizes query string by removing special characters and normalizing whitespace
   * @param {string} raw
   * @returns {string}
   */
  cleanQuery(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Fetches relevant images for a keyword from Wikimedia Commons
   * @param {string} keyword
   * @param {number} limit
   * @param {typeof fetch} [fetchFn]
   * @returns {Promise<Array<{ id: number|string, title: string, thumbUrl: string, fullUrl: string, sourceUrl: string }>>}
   */
  async fetchImages(keyword, limit = 6, fetchFn = globalThis.fetch) {
    const query = this.cleanQuery(keyword);
    if (!query) return [];
    if (this.cache.has(query)) return this.cache.get(query);

    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(query)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=320&origin=*`;

    if (typeof fetchFn !== 'function') {
      throw new Error('fetch function is not available');
    }

    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();

    const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
    const validImages = [];

    for (const page of pages) {
      if (page.imageinfo && page.imageinfo[0]) {
        const info = page.imageinfo[0];
        const thumbUrl = info.thumburl || info.url;
        const pageUrl = info.descriptionurl || info.descriptionshorturl || info.url;
        const title = (page.title || '').replace(/^File:/i, '').replace(/\.[^/.]+$/, '').trim();

        // Filter out non-standard / vector / audio / video media formats
        if (thumbUrl && !/\.(svg|ogg|ogv|pdf|webm|mid|midi|tiff?)$/i.test(thumbUrl)) {
          validImages.push({
            id: page.pageid,
            title: title || query,
            thumbUrl: thumbUrl,
            fullUrl: info.url,
            sourceUrl: pageUrl,
          });
        }
      }
      if (validImages.length >= limit) break;
    }

    this.cache.set(query, validImages);
    return validImages;
  }
}

export const defaultContextImageSearch = new ContextImageSearch();
