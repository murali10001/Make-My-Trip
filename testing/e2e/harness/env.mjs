/**
 * Environment configuration and pre-flight connectivity probe.
 */

let configuredBaseUrl = process.env.BACKEND_URL || 'http://localhost:8081';

export function setBaseUrl(url) {
  if (url) {
    // Strip trailing slash if present
    configuredBaseUrl = url.replace(/\/+$/, '');
  }
}

export function getBaseUrl() {
  return configuredBaseUrl;
}

/**
 * Pre-flight probe to verify backend server is reachable before running tests.
 * @param {string} [baseUrl]
 * @param {number} [maxRetries=15]
 * @param {number} [retryDelayMs=1000]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function probeServer(baseUrl = getBaseUrl(), maxRetries = 15, retryDelayMs = 1000) {
  const probeUrl = `${baseUrl.replace(/\/+$/, '')}/api/flight-status`;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(probeUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        return { ok: true };
      }
    } catch (err) {
      if (attempt === maxRetries) {
        return {
          ok: false,
          error: `Could not connect to backend server at ${baseUrl} after ${maxRetries} attempts (${err.message})`
        };
      }
      await new Promise(r => setTimeout(r, retryDelayMs));
    }
  }
  return { ok: false, error: `Connection timed out after ${maxRetries} attempts.` };
}
