/**
 * utils.js — Mocklet helper utilities
 *
 * Shared functions for clipboard, formatting, toast notifications, etc.
 */

// ── Toast Notifications ─────────────────────────────────────────────

let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return;
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms to display
 */
export function showToast(message, type = 'info', duration = 3000) {
  ensureToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Trigger reflow, then add visible class for animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    // Fallback removal
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── Clipboard ────────────────────────────────────────────────────────

/**
 * Copy text to clipboard with toast feedback.
 * @param {string} text
 * @param {string} label - what was copied, for the toast message
 */
export async function copyToClipboard(text, label = 'Text') {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`, 'success');
  } catch {
    // Fallback for insecure contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(`${label} copied to clipboard`, 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
    document.body.removeChild(textarea);
  }
}

// ── Formatting ───────────────────────────────────────────────────────

/**
 * Format an ISO timestamp to a human-readable relative time.
 * @param {string} iso - ISO 8601 timestamp
 * @returns {string}
 */
export function formatTimestamp(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;

  return date.toLocaleString();
}

/**
 * Format seconds into a human-readable countdown.
 * @param {number} seconds
 * @returns {string}
 */
export function formatCountdown(seconds) {
  if (seconds <= 0) return 'Expired';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// ── String Helpers ───────────────────────────────────────────────────

/**
 * Truncate a string with ellipsis.
 * @param {string} str
 * @param {number} len
 * @returns {string}
 */
export function truncate(str, len = 80) {
  if (!str) return '';
  if (str.length <= len) return str;
  return str.slice(0, len) + '\u2026';
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Curl Generator ───────────────────────────────────────────────────

/**
 * Generate a curl command for a route.
 * @param {string} baseUrl - e.g. https://mocklet-worker.../m/abc123
 * @param {Object} route - { method, path, status }
 * @returns {string}
 */
export function generateCurl(baseUrl, route) {
  const url = `${baseUrl}${route.path}`;
  const method = route.method === '*' ? 'GET' : route.method;

  let cmd = `curl -X ${method}`;

  // Add a sample body for methods that typically have one
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    cmd += ` \\\n  -H "Content-Type: application/json" \\\n  -d '{"key":"value"}'`;
  }

  cmd += ` \\\n  "${url}"`;
  return cmd;
}

// ── Method Colors ────────────────────────────────────────────────────

const METHOD_COLORS = {
  GET: '#3fb950',
  POST: '#58a6ff',
  PUT: '#d29922',
  PATCH: '#db61a2',
  DELETE: '#f85149',
  HEAD: '#8b949e',
  OPTIONS: '#8b949e',
  '*': '#bc8cff',
};

/**
 * Get the CSS color for an HTTP method.
 * @param {string} method
 * @returns {string}
 */
export function getMethodColor(method) {
  return METHOD_COLORS[method] || '#8b949e';
}

// ── DOM Helpers ──────────────────────────────────────────────────────

/**
 * Create an element with attributes and children.
 * @param {string} tag
 * @param {Object} attrs
 * @param {...(string|Node)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.assign(element.dataset, value);
    } else {
      element.setAttribute(key, value);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}
