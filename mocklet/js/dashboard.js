/**
 * dashboard.js — Mocklet Dashboard View (#/mock/{id})
 *
 * Displays mock info, routes, request logs, share link, and delete functionality.
 */

import { getMockInfo, getMockLogs, deleteMock, API_BASE } from './api.js';
import {
  showToast,
  escapeHtml,
  getMethodColor,
  formatTimestamp,
  formatCountdown,
  generateCurl,
  truncate,
  copyToClipboard,
  el,
} from './utils.js';

// ── State ────────────────────────────────────────────────────────────

let mockId = null;
let mockInfo = null;
let autoRefresh = false;
let autoRefreshTimer = null;
let countdownTimer = null;
let ttlRemaining = 0;

// ── Render ───────────────────────────────────────────────────────────

export async function renderDashboard(container, id) {
  cleanup();
  mockId = id;
  container.innerHTML = '';

  const loading = el('div', { className: 'loading-state' },
    el('div', { className: 'spinner' }),
    el('p', {}, 'Loading mock info...'),
  );
  container.appendChild(loading);

  try {
    mockInfo = await getMockInfo(id);
    ttlRemaining = mockInfo.ttl_remaining_seconds;
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(
      el('div', { className: 'error-state' },
        el('h2', {}, 'Mock Not Found'),
        el('p', {}, err.message || 'This mock may have expired or does not exist.'),
        el('a', { href: '#/', className: 'btn btn-primary' }, 'Create a New Mock'),
      )
    );
    return;
  }

  container.innerHTML = '';
  renderDashboardContent(container);

  // Start TTL countdown
  startCountdown();

  // Load initial logs
  refreshLogs();
}

function renderDashboardContent(container) {
  const baseUrl = mockInfo.base_url;

  // Info Section
  const infoSection = el('section', { className: 'dash-info' },
    el('div', { className: 'dash-info-header' },
      el('h1', { className: 'dash-title' }, escapeHtml(mockInfo.name)),
      el('span', { className: 'dash-id code-font' }, `ID: ${escapeHtml(mockInfo.id)}`),
    ),
    el('div', { className: 'dash-stats' },
      renderStat('Base URL', null, 'stat-url'),
      renderStat('Expires In', formatCountdown(ttlRemaining), 'stat-ttl'),
      renderStat('Hits', String(mockInfo.hits), 'stat-hits'),
      renderStat('Routes', String(mockInfo.route_count), 'stat-routes'),
    ),
  );

  // Inject base URL with copy button
  const urlStat = infoSection.querySelector('#stat-url');
  urlStat.innerHTML = '';
  urlStat.appendChild(el('div', { className: 'stat-label' }, 'Base URL'));
  urlStat.appendChild(
    el('div', { className: 'copy-field compact' },
      el('code', { className: 'code-font stat-url-code' }, baseUrl),
      el('button', {
        className: 'btn btn-small btn-ghost',
        onClick: () => copyToClipboard(baseUrl, 'Base URL'),
      }, 'Copy'),
    )
  );

  // Routes Table
  const routesSection = el('section', { className: 'dash-routes' },
    el('h2', { className: 'section-title' }, 'Routes'),
    renderRoutesTable(baseUrl),
  );

  // Logs Section
  const logsSection = el('section', { className: 'dash-logs' },
    el('div', { className: 'logs-header' },
      el('h2', { className: 'section-title' }, 'Request Log'),
      el('div', { className: 'logs-controls' },
        el('label', { className: 'toggle-label' },
          el('input', {
            type: 'checkbox',
            id: 'auto-refresh-toggle',
            className: 'toggle-input',
          }),
          el('span', { className: 'toggle-slider' }),
          ' Auto-refresh',
        ),
        el('button', {
          className: 'btn btn-small btn-ghost',
          id: 'refresh-logs-btn',
          onClick: () => refreshLogs(),
        }, 'Refresh'),
      ),
    ),
    el('div', { id: 'logs-container', className: 'logs-container' },
      el('div', { className: 'empty-state' }, el('p', {}, 'No requests logged yet. Send a request to your mock URL.')),
    ),
  );

  // Share Section
  const dashboardUrl = `${window.location.origin}${window.location.pathname}#/mock/${mockId}`;
  const shareSection = el('section', { className: 'dash-share' },
    el('h2', { className: 'section-title' }, 'Share'),
    el('p', { className: 'share-desc' }, 'Share this dashboard link with your team:'),
    el('div', { className: 'copy-field' },
      el('code', { className: 'code-font' }, dashboardUrl),
      el('button', {
        className: 'btn btn-small btn-ghost',
        onClick: () => copyToClipboard(dashboardUrl, 'Dashboard link'),
      }, 'Copy'),
    ),
  );

  // Delete Section
  const deleteSection = el('section', { className: 'dash-delete' },
    el('h2', { className: 'section-title' }, 'Danger Zone'),
    el('p', { className: 'delete-desc' }, 'Permanently delete this mock and all its data. This cannot be undone.'),
    el('button', {
      className: 'btn btn-danger',
      id: 'delete-mock-btn',
      onClick: handleDeleteClick,
    }, 'Delete Mock'),
  );

  container.appendChild(infoSection);
  container.appendChild(routesSection);
  container.appendChild(logsSection);
  container.appendChild(shareSection);
  container.appendChild(deleteSection);

  // Bind auto-refresh toggle
  setTimeout(() => {
    const toggle = document.getElementById('auto-refresh-toggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        autoRefresh = toggle.checked;
        if (autoRefresh) {
          startAutoRefresh();
        } else {
          stopAutoRefresh();
        }
      });
    }
  }, 0);
}

function renderStat(label, value, id) {
  return el('div', { className: 'stat-card', id: id || '' },
    el('div', { className: 'stat-label' }, label),
    el('div', { className: 'stat-value' }, value || '—'),
  );
}

function renderRoutesTable(baseUrl) {
  const table = el('div', { className: 'routes-table' });

  for (const route of mockInfo.routes) {
    const fullUrl = `${baseUrl}${route.path}`;
    const curl = generateCurl(baseUrl, route);

    const row = el('div', { className: 'route-row' },
      el('div', { className: 'route-row-info' },
        el('span', {
          className: 'method-badge',
          style: { backgroundColor: getMethodColor(route.method) },
        }, route.method === '*' ? 'ANY' : route.method),
        el('span', { className: 'route-path code-font' }, escapeHtml(route.path)),
        el('span', { className: 'route-status' }, String(route.status)),
        route.delay_ms > 0
          ? el('span', { className: 'route-delay' }, `+${route.delay_ms}ms`)
          : null,
      ),
      el('div', { className: 'route-row-actions' },
        el('button', {
          className: 'btn btn-small btn-ghost',
          onClick: () => copyToClipboard(fullUrl, 'URL'),
        }, 'Copy URL'),
        el('button', {
          className: 'btn btn-small btn-ghost',
          onClick: () => copyToClipboard(curl, 'curl command'),
        }, 'Copy curl'),
      ),
    );
    table.appendChild(row);
  }

  return table;
}

// ── TTL Countdown ────────────────────────────────────────────────────

function startCountdown() {
  stopCountdown();
  countdownTimer = setInterval(() => {
    ttlRemaining = Math.max(0, ttlRemaining - 1);
    const ttlEl = document.querySelector('#stat-ttl .stat-value');
    if (ttlEl) {
      ttlEl.textContent = formatCountdown(ttlRemaining);
      if (ttlRemaining <= 300) {
        ttlEl.classList.add('expiring');
      }
    }
    if (ttlRemaining <= 0) {
      stopCountdown();
      showToast('This mock has expired', 'error');
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

// ── Request Logs ─────────────────────────────────────────────────────

async function refreshLogs() {
  const container = document.getElementById('logs-container');
  if (!container) return;

  try {
    const data = await getMockLogs(mockId);
    renderLogEntries(container, data.entries);

    // Update hit count
    const hitsEl = document.querySelector('#stat-hits .stat-value');
    if (hitsEl) {
      hitsEl.textContent = String(data.count);
    }
  } catch (err) {
    // Silently fail on log refresh to avoid spam
    console.warn('Failed to refresh logs:', err.message);
  }
}

function renderLogEntries(container, entries) {
  container.innerHTML = '';

  if (!entries || entries.length === 0) {
    container.appendChild(
      el('div', { className: 'empty-state' },
        el('p', {}, 'No requests logged yet. Send a request to your mock URL.'),
      )
    );
    return;
  }

  // Show newest first
  const reversed = [...entries].reverse();

  const table = el('table', { className: 'log-table' },
    el('thead', {},
      el('tr', {},
        el('th', {}, 'Time'),
        el('th', {}, 'Method'),
        el('th', {}, 'Path'),
        el('th', {}, 'Status'),
        el('th', {}, 'Body'),
      ),
    ),
  );

  const tbody = el('tbody', {});

  for (const entry of reversed) {
    const row = el('tr', { className: 'log-row' },
      el('td', { className: 'log-time' }, formatTimestamp(entry.timestamp)),
      el('td', {},
        el('span', {
          className: 'method-badge method-badge-small',
          style: { backgroundColor: getMethodColor(entry.method) },
        }, entry.method),
      ),
      el('td', { className: 'code-font log-path' }, escapeHtml(entry.path)),
      el('td', { className: 'log-status' }, String(entry.response_status)),
      el('td', { className: 'log-body' }),
    );

    // Body cell — expandable
    const bodyCell = row.querySelector('.log-body');
    if (entry.body) {
      const preview = el('span', {
        className: 'log-body-preview code-font',
        title: 'Click to expand',
      }, escapeHtml(truncate(entry.body, 50)));

      let expanded = false;
      preview.addEventListener('click', () => {
        expanded = !expanded;
        if (expanded) {
          preview.textContent = entry.body;
          preview.classList.add('expanded');
        } else {
          preview.textContent = truncate(entry.body, 50);
          preview.classList.remove('expanded');
        }
      });

      bodyCell.appendChild(preview);
    } else {
      bodyCell.appendChild(el('span', { className: 'log-empty' }, '—'));
    }

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}

// ── Auto Refresh ─────────────────────────────────────────────────────

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshTimer = setInterval(() => refreshLogs(), 3000);
  showToast('Auto-refresh enabled (every 3s)', 'info');
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// ── Delete ───────────────────────────────────────────────────────────

function handleDeleteClick() {
  // Show delete confirmation modal
  const existing = document.getElementById('delete-modal');
  if (existing) existing.remove();

  const secretInput = el('input', {
    type: 'text',
    className: 'form-input code-font',
    placeholder: 'Paste your deletion secret',
    id: 'delete-secret-input',
  });

  const overlay = el('div', { className: 'modal-overlay', id: 'delete-modal' },
    el('div', { className: 'modal modal-small' },
      el('div', { className: 'modal-header' },
        el('h2', {}, 'Delete Mock'),
      ),
      el('div', { className: 'modal-body' },
        el('p', {}, 'Enter the secret that was provided when you created this mock.'),
        el('div', { className: 'form-group' }, secretInput),
      ),
      el('div', { className: 'modal-footer' },
        el('button', {
          className: 'btn btn-danger',
          id: 'confirm-delete-btn',
          onClick: async () => {
            const secret = secretInput.value.trim();
            if (!secret) {
              showToast('Secret is required', 'error');
              return;
            }

            const btn = document.getElementById('confirm-delete-btn');
            btn.disabled = true;
            btn.textContent = 'Deleting...';

            try {
              await deleteMock(mockId, secret);
              overlay.remove();
              showToast('Mock deleted successfully', 'success');
              cleanup();
              setTimeout(() => { window.location.hash = '#/'; }, 1000);
            } catch (err) {
              showToast(err.message || 'Failed to delete mock', 'error');
              btn.disabled = false;
              btn.textContent = 'Delete';
            }
          },
        }, 'Delete'),
        el('button', {
          className: 'btn btn-ghost',
          onClick: () => overlay.remove(),
        }, 'Cancel'),
      ),
    ),
  );

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);

  // Focus the secret input
  setTimeout(() => secretInput.focus(), 100);
}

// ── Cleanup ──────────────────────────────────────────────────────────

export function cleanup() {
  stopAutoRefresh();
  stopCountdown();
  autoRefresh = false;
  mockId = null;
  mockInfo = null;
}
