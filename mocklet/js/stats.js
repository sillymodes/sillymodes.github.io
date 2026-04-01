/**
 * stats.js — Mocklet public analytics dashboard
 *
 * Renders a privacy-friendly stats page showing site usage analytics.
 * No cookies, no PII, just aggregate counters.
 */

import { getStats } from './api.js';
import { el } from './utils.js';

// ── Country Code to Flag Emoji ──────────────────────────────────────

/**
 * Convert a 2-letter ISO country code to flag emoji.
 * Each letter maps to a regional indicator symbol (U+1F1E6..U+1F1FF).
 */
function countryFlag(code) {
  if (!code || code.length !== 2 || code === 'XX') return '';
  const offset = 0x1F1E6 - 65; // 'A' = 65
  const first = code.charCodeAt(0);
  const second = code.charCodeAt(1);
  if (first < 65 || first > 90 || second < 65 || second > 90) return '';
  return String.fromCodePoint(first + offset) + String.fromCodePoint(second + offset);
}

/**
 * Convert country code to a human-readable name (best effort).
 */
function countryName(code) {
  const names = {
    US: 'United States', GB: 'United Kingdom', DE: 'Germany', FR: 'France',
    JP: 'Japan', CN: 'China', KR: 'South Korea', IN: 'India', BR: 'Brazil',
    CA: 'Canada', AU: 'Australia', RU: 'Russia', IT: 'Italy', ES: 'Spain',
    NL: 'Netherlands', SE: 'Sweden', NO: 'Norway', FI: 'Finland', DK: 'Denmark',
    PL: 'Poland', AT: 'Austria', CH: 'Switzerland', BE: 'Belgium', PT: 'Portugal',
    IE: 'Ireland', NZ: 'New Zealand', SG: 'Singapore', HK: 'Hong Kong', TW: 'Taiwan',
    IL: 'Israel', ZA: 'South Africa', MX: 'Mexico', AR: 'Argentina', CL: 'Chile',
    CO: 'Colombia', TR: 'Turkey', UA: 'Ukraine', CZ: 'Czech Republic', RO: 'Romania',
    HU: 'Hungary', TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines', MY: 'Malaysia',
    ID: 'Indonesia', EG: 'Egypt', NG: 'Nigeria', KE: 'Kenya', PK: 'Pakistan',
    BD: 'Bangladesh', AE: 'UAE', SA: 'Saudi Arabia', QA: 'Qatar', GR: 'Greece',
    XX: 'Unknown',
  };
  return names[code] || code;
}

// ── Animated Counter ────────────────────────────────────────────────

/**
 * Animate a number from 0 to target over a duration.
 * Uses requestAnimationFrame for smooth animation.
 */
function animateCounter(element, target, duration = 1200) {
  if (target === 0) {
    element.textContent = '0';
    return;
  }
  const start = performance.now();
  const step = (timestamp) => {
    const progress = Math.min((timestamp - start) / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    element.textContent = current.toLocaleString();
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
}

// ── Chart Rendering ─────────────────────────────────────────────────

/**
 * Create a pure CSS bar chart from daily hits data.
 */
function renderBarChart(dailyHits) {
  const maxCount = Math.max(...dailyHits.map((d) => d.count), 1);

  const barsContainer = el('div', { className: 'stats-chart-bars' });

  dailyHits.forEach((day) => {
    const heightPercent = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
    const dateObj = new Date(day.date + 'T00:00:00Z');
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const bar = el('div', { className: 'stats-chart-bar-wrapper' },
      el('div', {
        className: 'stats-chart-bar',
        style: { height: `${Math.max(heightPercent, 2)}%` },
        dataset: { count: day.count.toLocaleString(), date: label },
      }),
    );

    barsContainer.appendChild(bar);
  });

  // X-axis labels (show every 5th)
  const labelsContainer = el('div', { className: 'stats-chart-labels' });
  dailyHits.forEach((day, i) => {
    const dateObj = new Date(day.date + 'T00:00:00Z');
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const labelEl = el('span', {
      className: 'stats-chart-label',
      style: { visibility: (i % 5 === 0 || i === dailyHits.length - 1) ? 'visible' : 'hidden' },
    }, label);
    labelsContainer.appendChild(labelEl);
  });

  return el('div', { className: 'stats-chart' },
    el('div', { className: 'stats-chart-area' },
      barsContainer,
    ),
    labelsContainer,
  );
}

// ── Table Rendering ─────────────────────────────────────────────────

/**
 * Render a ranked table with percentage bars.
 */
function renderRankedTable(items, labelKey, valueKey, formatLabel = null) {
  if (!items || items.length === 0) {
    return el('div', { className: 'stats-empty' }, 'No data yet');
  }

  const maxCount = items[0][valueKey];
  const totalCount = items.reduce((sum, item) => sum + item[valueKey], 0);

  const rows = items.map((item, index) => {
    const percent = maxCount > 0 ? (item[valueKey] / maxCount) * 100 : 0;
    const share = totalCount > 0 ? ((item[valueKey] / totalCount) * 100).toFixed(1) : '0.0';
    const label = formatLabel ? formatLabel(item[labelKey]) : item[labelKey];

    return el('div', { className: 'stats-table-row' },
      el('div', { className: 'stats-table-rank' }, `${index + 1}`),
      el('div', { className: 'stats-table-label' }, label),
      el('div', { className: 'stats-table-bar-cell' },
        el('div', { className: 'stats-table-bar-bg' },
          el('div', {
            className: 'stats-table-bar-fill',
            style: { width: `${percent}%` },
          }),
        ),
      ),
      el('div', { className: 'stats-table-count' }, item[valueKey].toLocaleString()),
      el('div', { className: 'stats-table-share' }, `${share}%`),
    );
  });

  return el('div', { className: 'stats-table' }, ...rows);
}

// ── Main Render ─────────────────────────────────────────────────────

export async function renderStats(container) {
  container.innerHTML = '';

  // Loading state
  const loadingEl = el('div', { className: 'loading-state' },
    el('div', { className: 'spinner' }),
    el('p', {}, 'Loading stats...'),
  );
  container.appendChild(loadingEl);

  let data;
  try {
    data = await getStats();
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(
      el('div', { className: 'error-state' },
        el('h2', {}, 'Could not load stats'),
        el('p', {}, err.message || 'An error occurred while fetching analytics data.'),
        el('a', { href: '#/', className: 'btn btn-primary' }, 'Go Home'),
      )
    );
    return;
  }

  container.innerHTML = '';

  const page = el('div', { className: 'stats-page' });

  // ── Title ──────────────────────────────────────────────────────────
  page.appendChild(
    el('div', { className: 'stats-header' },
      el('h1', {}, 'Site Statistics'),
      el('p', { className: 'stats-subtitle' },
        'Real-time analytics for Mocklet. Privacy-friendly -- no cookies, no tracking pixels, no PII.',
      ),
    )
  );

  // ── Hero Stats Row ────────────────────────────────────────────────
  const totalEl = el('span', { className: 'stats-hero-number' }, '0');
  const mocksEl = el('span', { className: 'stats-hero-number' }, '0');
  const todayEl = el('span', { className: 'stats-hero-number' }, '0');

  page.appendChild(
    el('div', { className: 'stats-hero-row' },
      el('div', { className: 'stats-hero-card' },
        el('div', { className: 'stats-hero-label' }, 'Total Page Views'),
        totalEl,
      ),
      el('div', { className: 'stats-hero-card' },
        el('div', { className: 'stats-hero-label' }, 'Mocks Created'),
        mocksEl,
      ),
      el('div', { className: 'stats-hero-card' },
        el('div', { className: 'stats-hero-label' }, 'Today\'s Visits'),
        todayEl,
      ),
    )
  );

  // Animate the counters after render
  requestAnimationFrame(() => {
    animateCounter(totalEl, data.total_hits);
    animateCounter(mocksEl, data.mocks_created);
    animateCounter(todayEl, data.today_hits);
  });

  // ── Daily Traffic Chart ───────────────────────────────────────────
  page.appendChild(
    el('div', { className: 'stats-section' },
      el('h2', { className: 'stats-section-title' }, 'Daily Traffic (Last 30 Days)'),
      renderBarChart(data.daily_hits || []),
    )
  );

  // ── Top Pages ─────────────────────────────────────────────────────
  page.appendChild(
    el('div', { className: 'stats-section' },
      el('h2', { className: 'stats-section-title' }, 'Top Pages'),
      renderRankedTable(data.top_pages, 'page', 'count', (page) => {
        return el('code', { className: 'code-font' }, page);
      }),
    )
  );

  // ── Top Countries ─────────────────────────────────────────────────
  page.appendChild(
    el('div', { className: 'stats-section' },
      el('h2', { className: 'stats-section-title' }, 'Top Countries'),
      renderRankedTable(data.top_countries, 'country', 'count', (code) => {
        const flag = countryFlag(code);
        const name = countryName(code);
        if (flag) {
          return el('span', {}, `${flag} ${name}`);
        }
        return el('span', {}, name);
      }),
    )
  );

  // ── Top Referrers ─────────────────────────────────────────────────
  page.appendChild(
    el('div', { className: 'stats-section' },
      el('h2', { className: 'stats-section-title' }, 'Top Referrers'),
      renderRankedTable(data.top_referrers, 'referrer', 'count'),
    )
  );

  // ── Privacy Notice ────────────────────────────────────────────────
  page.appendChild(
    el('div', { className: 'stats-privacy' },
      el('p', {},
        'All metrics are aggregate counters only. Mocklet does not use cookies, fingerprinting, or store any personally identifiable information. ',
        el('a', { href: '#/about' }, 'Learn more about Mocklet'),
        '.',
      ),
    )
  );

  container.appendChild(page);
}
