/**
 * Hugging Face token helpers for renderer process.
 * Token is read from main-process environment via IPC.
 */

let cachedToken = null;
let tokenFetchPromise = null;

function normalizeToken(value) {
  const token = String(value || '').trim();
  return token.length > 0 ? token : '';
}

function getHfTokenSync() {
  if (cachedToken !== null) {
    return cachedToken;
  }

  if (typeof window !== 'undefined' && window.ipcRenderer && typeof window.ipcRenderer.sendSync === 'function') {
    try {
      cachedToken = normalizeToken(window.ipcRenderer.sendSync('get_hf_token'));
      return cachedToken;
    } catch (error) {
      cachedToken = '';
      return cachedToken;
    }
  }

  cachedToken = '';
  return cachedToken;
}

async function getHfToken() {
  if (cachedToken !== null) {
    return cachedToken;
  }

  if (!tokenFetchPromise) {
    tokenFetchPromise = Promise.resolve(getHfTokenSync());
  }

  cachedToken = await tokenFetchPromise;
  tokenFetchPromise = null;
  return cachedToken;
}

function hasHfToken() {
  return getHfTokenSync().length > 0;
}

function clearHfTokenCache() {
  cachedToken = null;
  tokenFetchPromise = null;
}

module.exports = {
  clearHfTokenCache,
  getHfToken,
  getHfTokenSync,
  hasHfToken,
  normalizeToken,
};