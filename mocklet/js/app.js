/**
 * app.js — Mocklet main application & hash-based router
 *
 * Routes:
 *   #/           → Home / Route Builder
 *   #/mock/{id}  → Dashboard
 *   #/about      → About page
 *   #/reviews    → Reviews page
 *   #/stats      → Public stats dashboard
 */

import { renderBuilder } from './builder.js';
import { renderDashboard, cleanup as cleanupDashboard } from './dashboard.js';
import { renderReviews } from './reviews.js';
import { renderStats } from './stats.js';
import { escapeHtml, el } from './utils.js';
import { API_BASE, recordPageHit } from './api.js';

// ── Router ───────────────────────────────────────────────────────────

function parseHash() {
  const hash = window.location.hash || '#/';
  const path = hash.slice(1); // Remove leading '#'

  // Match routes
  if (path === '/' || path === '') {
    return { view: 'home' };
  }

  const mockMatch = path.match(/^\/mock\/([A-Za-z0-9]+)$/);
  if (mockMatch) {
    return { view: 'dashboard', id: mockMatch[1] };
  }

  if (path === '/about') {
    return { view: 'about' };
  }

  if (path === '/reviews') {
    return { view: 'reviews' };
  }

  if (path === '/stats') {
    return { view: 'stats' };
  }

  return { view: 'notfound' };
}

async function navigate() {
  const route = parseHash();
  const appContainer = document.getElementById('app');

  // Cleanup previous view
  cleanupDashboard();

  // Scroll to top on navigation
  window.scrollTo(0, 0);

  // Record page hit (fire-and-forget, never blocks rendering)
  const pagePath = route.view === 'dashboard'
    ? `/mock/${route.id}`
    : route.view === 'home' ? '/' : `/${route.view}`;
  recordPageHit(pagePath);

  switch (route.view) {
    case 'home':
      renderBuilder(appContainer);
      break;
    case 'dashboard':
      await renderDashboard(appContainer, route.id);
      break;
    case 'about':
      renderAbout(appContainer);
      break;
    case 'reviews':
      renderReviews(appContainer);
      break;
    case 'stats':
      renderStats(appContainer);
      break;
    default:
      render404(appContainer);
  }
}

// ── About Page ───────────────────────────────────────────────────────

function renderAbout(container) {
  container.innerHTML = '';
  container.appendChild(
    el('div', { className: 'about-page' },
      el('h1', {}, 'About Mocklet'),
      el('p', { className: 'about-lead' },
        'Mocklet lets you create disposable mock REST APIs in seconds. No signup, no install, no nonsense.',
      ),

      el('h2', {}, 'How It Works'),
      el('ol', { className: 'about-steps' },
        el('li', {},
          el('strong', {}, 'Define your routes'),
          ' \u2014 Specify HTTP methods, paths, response bodies, status codes, headers, and optional latency.',
        ),
        el('li', {},
          el('strong', {}, 'Create your mock'),
          ' \u2014 One click deploys your mock API. You get a live URL instantly.',
        ),
        el('li', {},
          el('strong', {}, 'Use it anywhere'),
          ' \u2014 Hit your mock endpoints from any HTTP client. Every request is logged so you can inspect what was sent.',
        ),
      ),

      el('h2', {}, 'Features'),
      el('ul', { className: 'about-features' },
        el('li', {}, 'Support for GET, POST, PUT, PATCH, DELETE, and wildcard methods'),
        el('li', {}, 'Path parameters (e.g. /users/:id)'),
        el('li', {}, 'Custom response headers'),
        el('li', {}, 'Configurable response latency (0\u20135000ms)'),
        el('li', {}, 'Dynamic response templates (interpolate request data)'),
        el('li', {}, 'Request logging with full headers and body capture'),
        el('li', {}, 'Auto-expiry after 24 hours'),
        el('li', {}, 'No signup, no API keys, no installation'),
      ),

      el('h2', {}, 'Limitations'),
      el('ul', { className: 'about-limits' },
        el('li', {}, 'Max 20 routes per mock'),
        el('li', {}, 'Max 32 KB response body per route'),
        el('li', {}, 'Max 100 logged requests per mock (ring buffer)'),
        el('li', {}, 'Mocks auto-expire after 24 hours'),
        el('li', {}, '10 mocks per IP per hour (rate limit)'),
      ),

      el('h2', {}, 'Technical Details'),
      el('p', {},
        'Mocklet\'s backend runs on ',
        el('a', { href: 'https://workers.cloudflare.com/', target: '_blank', rel: 'noopener' }, 'Cloudflare Workers'),
        ' with ',
        el('a', { href: 'https://developers.cloudflare.com/kv/', target: '_blank', rel: 'noopener' }, 'Workers KV'),
        ' for storage. The frontend is hosted on ',
        el('a', { href: 'https://pages.github.com/', target: '_blank', rel: 'noopener' }, 'GitHub Pages'),
        '. Everything is vanilla HTML, CSS, and JavaScript \u2014 no frameworks, no build step.',
      ),

      el('div', { className: 'about-coffee' },
        el('h2', {}, 'Support Mocklet'),
        el('p', {},
          'Mocklet is free forever. If it saved you time, consider buying me a coffee. Your support keeps the servers running.',
        ),
        el('a', {
          href: 'https://buymeacoffee.com/timtian',
          target: '_blank',
          rel: 'noopener',
          className: 'btn btn-primary btn-coffee',
        }, 'Buy Me a Coffee'),
      ),
    )
  );
}

// ── 404 ──────────────────────────────────────────────────────────────

function render404(container) {
  container.innerHTML = '';
  container.appendChild(
    el('div', { className: 'error-state' },
      el('h2', {}, 'Page Not Found'),
      el('p', {}, 'The page you\'re looking for doesn\'t exist.'),
      el('a', { href: '#/', className: 'btn btn-primary' }, 'Go Home'),
    )
  );
}

// ── App Shell ────────────────────────────────────────────────────────

function renderShell() {
  const root = document.getElementById('app-root');

  // Header
  const header = el('header', { className: 'app-header' },
    el('div', { className: 'header-inner' },
      el('a', { href: '#/', className: 'logo-link' },
        el('img', { src: 'assets/logo.svg', alt: 'Mocklet', className: 'logo-img', width: '32', height: '32' }),
        el('span', { className: 'logo-text' }, 'Mocklet'),
      ),
      el('nav', { className: 'header-nav' },
        el('a', { href: '#/', className: 'nav-link' }, 'Builder'),
        el('a', { href: '#/reviews', className: 'nav-link' }, 'Reviews'),
        el('a', { href: '#/about', className: 'nav-link' }, 'About'),
        el('a', {
          href: 'https://buymeacoffee.com/timtian',
          target: '_blank',
          rel: 'noopener',
          className: 'nav-link nav-coffee',
        }, 'Buy Me a Coffee'),
      ),
    ),
  );

  // Main container
  const main = el('main', { id: 'app', className: 'app-main' });

  // Footer
  const footer = el('footer', { className: 'app-footer' },
    el('div', { className: 'footer-inner' },
      el('p', {},
        'Mocklet is free forever. Built with care by ',
        el('a', { href: 'https://buymeacoffee.com/timtian', target: '_blank', rel: 'noopener' }, 'Tim Tian'),
        '.',
      ),
      el('p', { className: 'footer-links' },
        el('a', { href: '#/' }, 'Home'),
        el('span', { className: 'footer-sep' }, '\u00B7'),
        el('a', { href: '#/reviews' }, 'Reviews'),
        el('span', { className: 'footer-sep' }, '\u00B7'),
        el('a', { href: '#/stats' }, 'Stats'),
        el('span', { className: 'footer-sep' }, '\u00B7'),
        el('a', { href: '#/about' }, 'About'),
        el('span', { className: 'footer-sep' }, '\u00B7'),
        el('a', { href: 'https://buymeacoffee.com/timtian', target: '_blank', rel: 'noopener' }, 'Buy Me a Coffee'),
      ),
      el('p', { className: 'footer-api' },
        'API: ',
        el('code', { className: 'code-font' }, API_BASE),
      ),
    ),
  );

  root.innerHTML = '';
  root.appendChild(header);
  root.appendChild(main);
  root.appendChild(footer);
}

// ── Initialize ───────────────────────────────────────────────────────

function init() {
  renderShell();

  // Listen for hash changes
  window.addEventListener('hashchange', navigate);

  // Initial navigation
  navigate();
}

// Boot
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
