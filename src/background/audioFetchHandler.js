export function arrayBufferToBase64(buffer) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

export async function handleFetchAudioMessage(message, { fetchImpl = globalThis.fetch } = {}) {
  const url = message?.payload?.url;
  if (!url || typeof url !== 'string') {
    return {
      status: 'error',
      error: { message: 'url is required' },
    };
  }

  try {
    const res = await fetchImpl(url, {
      headers: {
        Referer: 'https://translate.google.com/',
      },
    });

    if (!res.ok) {
      return {
        status: 'error',
        error: { message: `Audio fetch returned HTTP ${res.status}` },
      };
    }

    const contentType = res.headers.get('content-type') || 'audio/mpeg';
    const buffer = await res.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    const dataUrl = `data:${contentType};base64,${base64}`;

    return {
      status: 'success',
      data: {
        dataUrl,
        contentType,
      },
    };
  } catch (err) {
    return {
      status: 'error',
      error: { message: err instanceof Error ? err.message : String(err) },
    };
  }
}
