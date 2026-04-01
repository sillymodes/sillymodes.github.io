/**
 * api.js — Mocklet Worker API client
 *
 * Handles all communication with the Cloudflare Worker backend.
 */

// ── Configuration ────────────────────────────────────────────────────

const PROD_URL = 'https://mocklet-worker.sillymodes.workers.dev';
const DEV_URL = 'http://localhost:8787';

/**
 * Determine the API base URL.
 * Uses localhost if the frontend is running on localhost, otherwise production.
 */
function getBaseUrl() {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return DEV_URL;
  }
  return PROD_URL;
}

export const API_BASE = getBaseUrl();

// ── API Functions ────────────────────────────────────────────────────

/**
 * Create a new mock endpoint set.
 *
 * @param {Object} config - { name?: string, routes: Array<Route> }
 * @param {Array} config.routes - Array of route objects:
 *   { method: string, path: string, status: number, headers?: Object, body?: string, delay_ms?: number }
 *
 * @returns {Promise<Object>} Response:
 *   { id, name, base_url, secret, created, expires_in_seconds, routes, rate_limit_remaining }
 *
 * @throws {Error} with message from API or network error
 */
export async function createMock(config) {
  const res = await fetch(`${API_BASE}/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to create mock`);
  }

  return data;
}

/**
 * Get mock metadata and route info.
 *
 * @param {string} id - Mock ID (6-char)
 *
 * @returns {Promise<Object>} Response:
 *   { id, name, created, hits, route_count, ttl_remaining_seconds, base_url, routes: [{ method, path, status, delay_ms }] }
 *
 * @throws {Error}
 */
export async function getMockInfo(id) {
  const res = await fetch(`${API_BASE}/api/info/${encodeURIComponent(id)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to get mock info`);
  }

  return data;
}

/**
 * Get request logs for a mock.
 *
 * @param {string} id - Mock ID
 *
 * @returns {Promise<Object>} Response:
 *   { mock_id, count, entries: Array<LogEntry> }
 *   LogEntry: { timestamp, method, path, headers, body, matched_route, response_status, params }
 *
 * @throws {Error}
 */
export async function getMockLogs(id) {
  const res = await fetch(`${API_BASE}/api/logs/${encodeURIComponent(id)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to get logs`);
  }

  return data;
}

/**
 * Delete a mock (requires the secret returned at creation).
 *
 * @param {string} id - Mock ID
 * @param {string} secret - Deletion secret (32-char token)
 *
 * @returns {Promise<Object>} Response:
 *   { message, id }
 *
 * @throws {Error}
 */
export async function deleteMock(id, secret) {
  const res = await fetch(`${API_BASE}/api/delete/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${secret}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to delete mock`);
  }

  return data;
}
