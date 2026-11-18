/**
 * HTTP Client Helper for E2E Tests.
 * Uses native fetch with timeout handling, JSON serialization/parsing, and response wrappers.
 */

import { getBaseUrl } from './env.mjs';

export class HttpClient {
  constructor(baseUrl = null, defaultTimeoutMs = 8000) {
    this._baseUrl = baseUrl;
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  get baseUrl() {
    return (this._baseUrl || getBaseUrl()).replace(/\/+$/, '');
  }

  /**
   * Builds full URL with optional query parameters.
   * @param {string} path
   * @param {Record<string, any>} [params]
   * @returns {string}
   */
  buildUrl(path, params) {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  /**
   * Internal request executor.
   * @param {string} method
   * @param {string} path
   * @param {object} [options]
   * @returns {Promise<{ status: number, ok: boolean, headers: Headers, data: any, raw: string }>}
   */
  async request(method, path, options = {}) {
    const {
      params,
      body,
      headers = {},
      timeoutMs = this.defaultTimeoutMs
    } = options;

    const url = this.buildUrl(path, params);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const reqHeaders = {
      Accept: 'application/json, text/plain, */*',
      ...headers
    };

    let reqBody = undefined;
    if (body !== undefined && body !== null) {
      if (typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
        reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
        reqBody = JSON.stringify(body);
      } else {
        reqBody = body;
      }
    }

    try {
      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: reqBody,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const raw = await res.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }

      return {
        status: res.status,
        ok: res.ok,
        headers: res.headers,
        data,
        raw
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms: ${method} ${url}`);
      }
      throw err;
    }
  }

  get(path, options) {
    return this.request('GET', path, options);
  }

  post(path, body, options = {}) {
    return this.request('POST', path, { ...options, body });
  }

  put(path, body, options = {}) {
    return this.request('PUT', path, { ...options, body });
  }

  delete(path, options) {
    return this.request('DELETE', path, options);
  }
}

export const client = new HttpClient();
