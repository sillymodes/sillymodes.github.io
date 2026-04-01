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

// ── Reviews API ───────────────────────────────────────────────────────

/**
 * Submit a review.
 *
 * @param {{ rating: number, comment?: string, name?: string }} review
 * @returns {Promise<Object>} { success, average_rating, total_reviews }
 * @throws {Error}
 */
export async function submitReview(review) {
  const res = await fetch(`${API_BASE}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to submit review`);
  }

  return data;
}

/**
 * Get reviews with pagination.
 *
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<Object>} { average_rating, total_reviews, count_by_star, reviews, page, total_pages }
 * @throws {Error}
 */
export async function getReviews(page = 1, limit = 10) {
  const res = await fetch(`${API_BASE}/api/reviews?page=${page}&limit=${limit}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to get reviews`);
  }

  return data;
}

/**
 * Get just the review aggregate summary.
 *
 * @returns {Promise<Object>} { average_rating, total_reviews, count_by_star }
 * @throws {Error}
 */
export async function getReviewsSummary() {
  const res = await fetch(`${API_BASE}/api/reviews/summary`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to get reviews summary`);
  }

  return data;
}

// ── Stats API ────────────────────────────────────────────────────────

/**
 * Record a page hit. Fire-and-forget — does not throw or block.
 *
 * @param {string} page - e.g. "/", "/about", "/mock/abc123"
 */
export function recordPageHit(page) {
  const payload = JSON.stringify({ page });

  // Prefer sendBeacon for non-blocking, survives page unload
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(`${API_BASE}/api/stats/hit`, blob);
    return;
  }

  // Fallback: fire-and-forget fetch
  fetch(`${API_BASE}/api/stats/hit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Silently ignore failures — analytics should never break the app
  });
}

/**
 * Get all public stats.
 *
 * @returns {Promise<Object>} {
 *   total_hits, today_hits, mocks_created,
 *   daily_hits: [{date, count}...],
 *   top_pages: [{page, count}...],
 *   top_countries: [{country, count}...],
 *   top_referrers: [{referrer, count}...]
 * }
 * @throws {Error}
 */
export async function getStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to get stats`);
  }

  return data;
}
