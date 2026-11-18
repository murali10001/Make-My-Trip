/**
 * SSE Streaming Listener and Parser.
 * Uses native fetch, ReadableStream, line-buffered parsing, and AbortController.
 */

import { getBaseUrl } from './env.mjs';

/**
 * Connects to an SSE endpoint and captures streaming events.
 * @param {string} path - Endpoint path (e.g. '/api/flight-status/stream')
 * @param {object} options
 * @param {Record<string, any>} [options.params]
 * @param {number} [options.timeoutMs=5000] - Total time to listen before resolving
 * @param {number} [options.maxEvents=1] - Resolve early once N events have been captured
 * @param {string[]} [options.expectedEvents] - If provided, captures only matching event types
 * @param {Function} [options.triggerAction] - Action to execute once stream is connected
 * @returns {Promise<Array<{ event: string, data: any, rawData: string }>>}
 */
export async function listenToSse(path, options = {}) {
  const {
    params,
    timeoutMs = 6000,
    maxEvents = 1,
    expectedEvents = null,
    triggerAction = null
  } = options;

  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${baseUrl}${cleanPath}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const events = [];
  const controller = new AbortController();
  let streamClosed = false;

  const closeStream = () => {
    if (!streamClosed) {
      streamClosed = true;
      try {
        controller.abort();
      } catch {
        // ignore
      }
    }
  };

  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      closeStream();
      resolve(events);
    }, timeoutMs);

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      if (!res.ok) {
        clearTimeout(timeoutId);
        closeStream();
        return reject(new Error(`SSE connection failed with HTTP ${res.status}: ${res.statusText}`));
      }

      if (!res.body) {
        clearTimeout(timeoutId);
        closeStream();
        return reject(new Error('SSE response body is null'));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = 'message';
      let currentDataLines = [];
      let triggerExecuted = false;

      const flushEvent = () => {
        if (currentDataLines.length > 0 || currentEvent !== 'message') {
          const rawData = currentDataLines.join('\n');
          let parsedData = rawData;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = rawData;
          }

          const captured = {
            event: currentEvent,
            data: parsedData,
            rawData
          };

          if (!expectedEvents || expectedEvents.includes(currentEvent)) {
            events.push(captured);
          }

          currentEvent = 'message';
          currentDataLines = [];

          if (events.length >= maxEvents) {
            clearTimeout(timeoutId);
            closeStream();
            resolve(events);
          }
        }
      };

      (async () => {
        try {
          while (!streamClosed) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop(); // keep partial line

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === '') {
                // Empty line denotes end of an event block
                flushEvent();

                // If stream is connected and we haven't run the triggerAction yet, run it
                if (!triggerExecuted && triggerAction) {
                  triggerExecuted = true;
                  setTimeout(() => {
                    try {
                      Promise.resolve(triggerAction()).catch(err => {
                        console.error('Trigger action error:', err.message);
                      });
                    } catch (err) {
                      console.error('Trigger action error:', err.message);
                    }
                  }, 100);
                }
              } else if (trimmed.startsWith('event:')) {
                currentEvent = trimmed.slice(6).trim();
              } else if (trimmed.startsWith('data:')) {
                currentDataLines.push(trimmed.slice(5).trim());
              }
            }
          }
          flushEvent();
          clearTimeout(timeoutId);
          resolve(events);
        } catch (err) {
          if (err.name === 'AbortError') {
            resolve(events);
          } else {
            clearTimeout(timeoutId);
            resolve(events);
          }
        }
      })();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        resolve(events);
      } else {
        reject(err);
      }
    }
  });
}
