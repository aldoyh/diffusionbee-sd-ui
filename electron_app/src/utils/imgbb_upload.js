/**
 * imgbb.com image upload service
 *
 * Uploads images to imgbb.com using the API key stored in app settings.
 * The API key must be provided by the user via Settings.
 *
 * API docs: https://api.imgbb.com/
 */

const IMGBB_ENDPOINT = 'https://api.imgbb.com/1/upload';

/**
 * Read a local file as base64 via Electron IPC (main process fs).
 * Falls back to fetch-based reading if IPC is unavailable.
 * @param {string} imageUrl - A file:// or absolute path to the image
 * @returns {Promise<string>} Base64-encoded image string (without data URI prefix)
 */
async function imageUrlToBase64(imageUrl) {
  // Normalize the path
  let path = imageUrl;
  if (path.startsWith('file://')) {
    path = path.slice(7);
  }

  // Prefer IPC-based reading (more reliable in Electron)
  if (window.ipcRenderer && typeof window.ipcRenderer.invoke === 'function') {
    try {
      const base64 = await window.ipcRenderer.invoke('read_file_base64', path);
      if (base64) return base64;
    } catch (e) {
      console.warn('IPC read_file_base64 failed, falling back to fetch:', e);
    }
  }

  // Fallback: read via fetch (only works with webSecurity disabled)
  const response = await fetch(`file://${path}`);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload an image to imgbb.com.
 * @param {string} imageUrl - File path or URL to the image
 * @param {string} apiKey - imgbb API key
 * @returns {Promise<{url: string, deleteUrl: string, thumbnailUrl: string}>}
 */
export async function uploadToImgbb(imageUrl, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('imgbb API key is required. Set it in Settings.');
  }

  const base64Image = await imageUrlToBase64(imageUrl);

  const formData = new URLSearchParams();
  formData.append('key', apiKey.trim());
  formData.append('image', base64Image);

  const response = await fetch(IMGBB_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'imgbb upload failed');
  }

  return {
    url: result.data.url,
    deleteUrl: result.data.delete_url,
    thumbnailUrl: result.data.thumb?.url || result.data.url,
    title: result.data.title || '',
  };
}

/**
 * Return the imgbb API key from app state settings.
 * @param {object} app - The Vue app instance
 * @returns {string}
 */
export function getImgbbApiKey(app) {
  if (
    app &&
    app.app_state &&
    app.app_state.app_data &&
    app.app_state.app_data.settings
  ) {
    return app.app_state.app_data.settings.imgbb_api_key || '';
  }
  return '';
}
