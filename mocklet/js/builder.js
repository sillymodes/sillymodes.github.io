/**
 * builder.js — Mocklet Route Builder (Home View)
 *
 * Hero section + route builder form + route list + create button.
 */

import { createMock, API_BASE } from './api.js';
import { showToast, escapeHtml, getMethodColor, truncate, el, copyToClipboard } from './utils.js';

// ── State ────────────────────────────────────────────────────────────

let routes = [];
let editingIndex = -1; // -1 = adding new, >= 0 = editing existing

// ── Status Code Presets ──────────────────────────────────────────────

const STATUS_PRESETS = [
  { value: 200, label: '200 OK' },
  { value: 201, label: '201 Created' },
  { value: 204, label: '204 No Content' },
  { value: 301, label: '301 Moved' },
  { value: 400, label: '400 Bad Request' },
  { value: 401, label: '401 Unauthorized' },
  { value: 403, label: '403 Forbidden' },
  { value: 404, label: '404 Not Found' },
  { value: 409, label: '409 Conflict' },
  { value: 422, label: '422 Unprocessable' },
  { value: 429, label: '429 Rate Limited' },
  { value: 500, label: '500 Server Error' },
  { value: 502, label: '502 Bad Gateway' },
  { value: 503, label: '503 Unavailable' },
];

// ── Render ───────────────────────────────────────────────────────────

export function renderBuilder(container) {
  routes = [];
  editingIndex = -1;
  container.innerHTML = '';

  // Hero Section
  const hero = el('section', { className: 'hero' },
    el('h1', { className: 'hero-title' },
      'Spin up a fake API in ',
      el('span', { className: 'hero-accent' }, '5 seconds'),
    ),
    el('p', { className: 'hero-subtitle' }, 'No signup. No install. No nonsense.'),
    el('div', { className: 'hero-steps' },
      renderStep('1', 'Define', 'Add routes with methods, paths, and responses'),
      renderStep('2', 'Create', 'One click to deploy your mock API'),
      renderStep('3', 'Use', 'Hit your endpoints instantly from anywhere'),
    ),
  );

  // Builder Section
  const builderSection = el('section', { className: 'builder-section' },
    el('h2', { className: 'section-title' }, 'Build Your Mock'),
    renderMockNameInput(),
    renderRouteForm(),
    el('div', { id: 'route-list', className: 'route-list' }),
    renderCreateButton(),
  );

  // How it works (SEO content)
  const howItWorks = el('section', { className: 'how-it-works' },
    el('h2', { className: 'section-title' }, 'How It Works'),
    el('p', { className: 'how-intro' },
      'Mocklet is a free mock API generator that lets developers create temporary REST API endpoints without signing up or installing anything. Here is how to get started:',
    ),
    el('div', { className: 'how-grid' },
      renderHowCard('Instant Mock APIs', 'Create a free mock API online in seconds. Define your endpoints, set response bodies, status codes, and headers. Your mock is live immediately with a unique URL you can share with your team.'),
      renderHowCard('Test Webhooks & Integrations', 'Need to test webhook endpoints or third-party integrations? Mocklet captures every incoming request with full headers and body, so you can inspect exactly what your services are sending.'),
      renderHowCard('No Signup Required', 'Unlike other mock JSON API tools, Mocklet requires no account, no signup, and no installation. Just define your routes and start testing. Works in any browser on any device.'),
      renderHowCard('Disposable by Design', 'Every mock auto-expires after 24 hours. Perfect for quick tests, CI/CD pipelines, and development without leaving stale endpoints behind. Create as many mocks as you need.'),
    ),
    el('h3', { className: 'how-subheading' }, 'Built for Modern Development Workflows'),
    el('p', { className: 'how-detail' },
      'Whether you are building a frontend prototype, running integration tests in your CI/CD pipeline, debugging webhook payloads, or demoing an API to your team, Mocklet gives you a live endpoint in seconds. Define custom status codes (200, 201, 400, 404, 500, and more), set response headers, add simulated latency, and use dynamic response templates that interpolate request data.',
    ),
  );

  // FAQ Section (SEO + user help)
  const faqSection = el('section', { className: 'faq-section', id: 'faq' },
    el('h2', { className: 'section-title' }, 'Frequently Asked Questions'),
    el('div', { className: 'faq-list' },
      renderFaqItem(
        'What is a mock API?',
        'A mock API is a simulated API endpoint that returns predefined responses instead of connecting to a real backend server. Developers use mock APIs to test frontend code independently, prototype integrations before the backend is ready, simulate error scenarios like 500 or 404 responses, and validate workflows without depending on external services. Mocklet makes it easy to create disposable mock REST APIs in seconds with no signup required.'
      ),
      renderFaqItem(
        'How long do Mocklet endpoints last?',
        'Every Mocklet endpoint auto-expires after 24 hours. This disposable design keeps things clean and is ideal for quick tests, CI/CD pipeline runs, and prototyping sessions. You do not need to worry about cleaning up old endpoints. If you need a fresh mock, just create a new one — there is no limit on how many mocks you can create over time.'
      ),
      renderFaqItem(
        'Do I need to sign up to use Mocklet?',
        'No. Mocklet requires no account, no API key, and no installation. Just open the website, define your routes using the builder form above, and click Create. Your mock API is deployed instantly to Cloudflare\'s global edge network and you get a unique URL you can use from any HTTP client — curl, Postman, your browser, or your application code.'
      ),
      renderFaqItem(
        'Is Mocklet free?',
        'Yes, Mocklet is completely free to use. There are no paid tiers, no credit card requirements, and no hidden fees. The service is sustained by optional donations via Buy Me a Coffee. You can create mock APIs with up to 20 routes each, with 32 KB response bodies, custom headers, configurable latency, and full request logging — all at no cost.'
      ),
      renderFaqItem(
        'Can I use Mocklet for testing webhooks?',
        'Absolutely. Mocklet captures every incoming request including the full HTTP headers and request body, making it an excellent tool for inspecting webhook payloads during development. Set up a mock endpoint with any path, point your webhook sender at it, and then view all captured requests in the dashboard\'s live request log. You can see the exact data your service is sending in real time.'
      ),
    ),
  );

  container.appendChild(hero);
  container.appendChild(builderSection);
  container.appendChild(howItWorks);
  container.appendChild(faqSection);

  updateRouteList();
}

function renderStep(number, title, desc) {
  return el('div', { className: 'step' },
    el('div', { className: 'step-number' }, number),
    el('div', { className: 'step-content' },
      el('div', { className: 'step-title' }, title),
      el('div', { className: 'step-desc' }, desc),
    ),
  );
}

function renderHowCard(title, text) {
  return el('div', { className: 'how-card' },
    el('h3', {}, title),
    el('p', {}, text),
  );
}

function renderFaqItem(question, answer) {
  const content = el('div', { className: 'faq-content' },
    el('p', {}, answer),
  );
  const chevron = el('span', { className: 'faq-chevron' }, '');

  const header = el('button', {
    className: 'faq-question',
    type: 'button',
    'aria-expanded': 'false',
  },
    el('span', {}, question),
    chevron,
  );

  const item = el('div', { className: 'faq-item' }, header, content);

  header.addEventListener('click', () => {
    const isOpen = item.classList.contains('faq-open');
    // Close all other items
    const allItems = item.parentElement?.querySelectorAll('.faq-item.faq-open');
    if (allItems) {
      allItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('faq-open');
          other.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
        }
      });
    }
    item.classList.toggle('faq-open', !isOpen);
    header.setAttribute('aria-expanded', String(!isOpen));
  });

  return item;
}

function renderMockNameInput() {
  return el('div', { className: 'form-group' },
    el('label', { for: 'mock-name', className: 'form-label' }, 'Mock Name'),
    el('input', {
      type: 'text',
      id: 'mock-name',
      className: 'form-input',
      placeholder: 'My Test API (optional)',
      maxlength: '100',
    }),
  );
}

function renderRouteForm() {
  const form = el('div', { className: 'route-form', id: 'route-form' },
    el('h3', { className: 'form-section-title', id: 'route-form-title' }, 'Add Route'),

    // Row 1: Method + Path
    el('div', { className: 'form-row' },
      el('div', { className: 'form-group form-group-method' },
        el('label', { for: 'route-method', className: 'form-label' }, 'Method'),
        renderMethodSelect(),
      ),
      el('div', { className: 'form-group form-group-path' },
        el('label', { for: 'route-path', className: 'form-label' }, 'Path'),
        el('input', {
          type: 'text',
          id: 'route-path',
          className: 'form-input',
          placeholder: '/users/:id',
        }),
      ),
    ),

    // Row 2: Status + Latency
    el('div', { className: 'form-row' },
      el('div', { className: 'form-group form-group-status' },
        el('label', { for: 'route-status', className: 'form-label' }, 'Status Code'),
        renderStatusSelect(),
      ),
      el('div', { className: 'form-group form-group-latency' },
        el('label', { for: 'route-latency', className: 'form-label' },
          'Latency: ',
          el('span', { id: 'latency-value' }, '0ms'),
        ),
        el('input', {
          type: 'range',
          id: 'route-latency',
          className: 'form-range',
          min: '0',
          max: '5000',
          step: '50',
          value: '0',
        }),
      ),
    ),

    // Headers
    el('div', { className: 'form-group' },
      el('label', { className: 'form-label' }, 'Response Headers'),
      el('div', { id: 'headers-container', className: 'headers-container' }),
      el('button', {
        type: 'button',
        className: 'btn btn-small btn-ghost',
        id: 'add-header-btn',
      }, '+ Add Header'),
    ),

    // Body
    el('div', { className: 'form-group' },
      el('label', { for: 'route-body', className: 'form-label' }, 'Response Body'),
      el('textarea', {
        id: 'route-body',
        className: 'form-textarea code-font',
        placeholder: '{"message": "Hello, world!"}',
        rows: '8',
        spellcheck: 'false',
      }),
    ),

    // Action buttons
    el('div', { className: 'form-actions' },
      el('button', {
        type: 'button',
        className: 'btn btn-primary',
        id: 'add-route-btn',
      }, 'Add Route'),
      el('button', {
        type: 'button',
        className: 'btn btn-ghost',
        id: 'cancel-edit-btn',
        style: { display: 'none' },
      }, 'Cancel'),
    ),
  );

  // Event listeners (after DOM exists)
  setTimeout(() => bindFormEvents(), 0);

  return form;
}

function renderMethodSelect() {
  const select = el('select', { id: 'route-method', className: 'form-select' });
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', '*'];
  for (const m of methods) {
    const opt = el('option', { value: m }, m === '*' ? '* (any)' : m);
    select.appendChild(opt);
  }
  return select;
}

function renderStatusSelect() {
  const wrapper = el('div', { className: 'status-input-wrapper' });
  const select = el('select', { id: 'route-status-preset', className: 'form-select' });

  for (const s of STATUS_PRESETS) {
    select.appendChild(el('option', { value: String(s.value) }, s.label));
  }
  select.appendChild(el('option', { value: 'custom' }, 'Custom...'));

  const customInput = el('input', {
    type: 'number',
    id: 'route-status-custom',
    className: 'form-input',
    placeholder: '418',
    min: '100',
    max: '599',
    style: { display: 'none' },
  });

  wrapper.appendChild(select);
  wrapper.appendChild(customInput);
  return wrapper;
}

// ── Form Event Binding ───────────────────────────────────────────────

function bindFormEvents() {
  // Latency slider
  const latencySlider = document.getElementById('route-latency');
  const latencyValue = document.getElementById('latency-value');
  if (latencySlider && latencyValue) {
    latencySlider.addEventListener('input', () => {
      latencyValue.textContent = `${latencySlider.value}ms`;
    });
  }

  // Status preset toggle
  const statusPreset = document.getElementById('route-status-preset');
  const statusCustom = document.getElementById('route-status-custom');
  if (statusPreset && statusCustom) {
    statusPreset.addEventListener('change', () => {
      if (statusPreset.value === 'custom') {
        statusCustom.style.display = 'block';
        statusCustom.focus();
      } else {
        statusCustom.style.display = 'none';
      }
    });
  }

  // Add header button
  const addHeaderBtn = document.getElementById('add-header-btn');
  if (addHeaderBtn) {
    addHeaderBtn.addEventListener('click', () => addHeaderRow());
  }

  // Add default Content-Type header
  addHeaderRow('Content-Type', 'application/json');

  // Add route button
  const addRouteBtn = document.getElementById('add-route-btn');
  if (addRouteBtn) {
    addRouteBtn.addEventListener('click', handleAddRoute);
  }

  // Cancel edit button
  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelEdit);
  }

  // Create mock button
  const createBtn = document.getElementById('create-mock-btn');
  if (createBtn) {
    createBtn.addEventListener('click', handleCreateMock);
  }
}

function addHeaderRow(key = '', value = '') {
  const container = document.getElementById('headers-container');
  if (!container) return;

  const row = el('div', { className: 'header-row' },
    el('input', {
      type: 'text',
      className: 'form-input header-key',
      placeholder: 'Header name',
      value: key,
    }),
    el('input', {
      type: 'text',
      className: 'form-input header-value',
      placeholder: 'Header value',
      value: value,
    }),
    el('button', {
      type: 'button',
      className: 'btn btn-icon btn-danger',
      onClick: () => row.remove(),
    }, '\u00D7'),
  );

  container.appendChild(row);
}

// ── Form Handling ────────────────────────────────────────────────────

function getFormData() {
  const method = document.getElementById('route-method').value;
  const path = document.getElementById('route-path').value.trim();
  const statusPreset = document.getElementById('route-status-preset').value;
  const statusCustom = document.getElementById('route-status-custom').value;
  const status = statusPreset === 'custom' ? parseInt(statusCustom, 10) : parseInt(statusPreset, 10);
  const latency = parseInt(document.getElementById('route-latency').value, 10);
  const body = document.getElementById('route-body').value;

  // Collect headers
  const headers = {};
  const headerRows = document.querySelectorAll('.header-row');
  headerRows.forEach(row => {
    const k = row.querySelector('.header-key').value.trim();
    const v = row.querySelector('.header-value').value.trim();
    if (k) headers[k] = v;
  });

  return { method, path, status, headers, body, delay_ms: latency };
}

function validateRouteForm(data) {
  if (!data.path) {
    showToast('Path is required (e.g. /users)', 'error');
    return false;
  }
  if (!data.path.startsWith('/')) {
    showToast('Path must start with /', 'error');
    return false;
  }
  if (isNaN(data.status) || data.status < 100 || data.status > 599) {
    showToast('Status code must be between 100 and 599', 'error');
    return false;
  }
  if (data.body && data.body.length > 32 * 1024) {
    showToast('Response body exceeds 32 KB limit', 'error');
    return false;
  }
  return true;
}

function resetForm() {
  document.getElementById('route-method').value = 'GET';
  document.getElementById('route-path').value = '';
  document.getElementById('route-status-preset').value = '200';
  document.getElementById('route-status-custom').style.display = 'none';
  document.getElementById('route-status-custom').value = '';
  document.getElementById('route-latency').value = '0';
  document.getElementById('latency-value').textContent = '0ms';
  document.getElementById('route-body').value = '';

  // Reset headers to default
  const container = document.getElementById('headers-container');
  container.innerHTML = '';
  addHeaderRow('Content-Type', 'application/json');

  // Reset edit state
  editingIndex = -1;
  document.getElementById('route-form-title').textContent = 'Add Route';
  document.getElementById('add-route-btn').textContent = 'Add Route';
  document.getElementById('cancel-edit-btn').style.display = 'none';
}

function handleAddRoute() {
  const data = getFormData();
  if (!validateRouteForm(data)) return;

  if (editingIndex >= 0) {
    routes[editingIndex] = data;
    showToast('Route updated', 'success');
  } else {
    if (routes.length >= 20) {
      showToast('Maximum 20 routes per mock', 'error');
      return;
    }
    routes.push(data);
    showToast('Route added', 'success');
  }

  resetForm();
  updateRouteList();
}

function cancelEdit() {
  resetForm();
}

function editRoute(index) {
  const route = routes[index];
  editingIndex = index;

  document.getElementById('route-method').value = route.method;
  document.getElementById('route-path').value = route.path;

  // Status
  const preset = STATUS_PRESETS.find(s => s.value === route.status);
  if (preset) {
    document.getElementById('route-status-preset').value = String(route.status);
    document.getElementById('route-status-custom').style.display = 'none';
  } else {
    document.getElementById('route-status-preset').value = 'custom';
    document.getElementById('route-status-custom').style.display = 'block';
    document.getElementById('route-status-custom').value = String(route.status);
  }

  // Latency
  document.getElementById('route-latency').value = String(route.delay_ms || 0);
  document.getElementById('latency-value').textContent = `${route.delay_ms || 0}ms`;

  // Body
  document.getElementById('route-body').value = route.body || '';

  // Headers
  const container = document.getElementById('headers-container');
  container.innerHTML = '';
  const headers = route.headers || {};
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    addHeaderRow('Content-Type', 'application/json');
  } else {
    for (const [k, v] of entries) {
      addHeaderRow(k, v);
    }
  }

  // Update UI
  document.getElementById('route-form-title').textContent = 'Edit Route';
  document.getElementById('add-route-btn').textContent = 'Update Route';
  document.getElementById('cancel-edit-btn').style.display = 'inline-flex';

  // Scroll to form
  document.getElementById('route-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteRoute(index) {
  routes.splice(index, 1);
  if (editingIndex === index) {
    resetForm();
  } else if (editingIndex > index) {
    editingIndex--;
  }
  updateRouteList();
  showToast('Route removed', 'info');
}

// ── Route List ───────────────────────────────────────────────────────

function updateRouteList() {
  const container = document.getElementById('route-list');
  if (!container) return;

  container.innerHTML = '';

  if (routes.length === 0) {
    container.appendChild(
      el('div', { className: 'empty-state' },
        el('div', { className: 'empty-icon' }, '\u2195'),
        el('p', {}, 'No routes yet. Add your first route above.'),
      )
    );
    return;
  }

  // Section header
  container.appendChild(
    el('div', { className: 'route-list-header' },
      el('h3', {}, `Routes (${routes.length})`),
    )
  );

  routes.forEach((route, i) => {
    const card = el('div', { className: 'route-card' },
      el('div', { className: 'route-card-main' },
        el('span', {
          className: 'method-badge',
          style: { backgroundColor: getMethodColor(route.method) },
        }, route.method === '*' ? 'ANY' : route.method),
        el('span', { className: 'route-path code-font' }, escapeHtml(route.path)),
        el('span', { className: 'route-status' }, String(route.status)),
        route.delay_ms > 0
          ? el('span', { className: 'route-delay' }, `${route.delay_ms}ms`)
          : null,
      ),
      route.body
        ? el('div', { className: 'route-body-preview code-font' }, escapeHtml(truncate(route.body, 120)))
        : null,
      el('div', { className: 'route-card-actions' },
        el('button', {
          className: 'btn btn-small btn-ghost',
          onClick: () => editRoute(i),
        }, 'Edit'),
        el('button', {
          className: 'btn btn-small btn-ghost btn-danger-text',
          onClick: () => deleteRoute(i),
        }, 'Delete'),
      ),
    );
    container.appendChild(card);
  });
}

// ── Create Mock ──────────────────────────────────────────────────────

function renderCreateButton() {
  return el('div', { className: 'create-section' },
    el('button', {
      type: 'button',
      className: 'btn btn-primary btn-large',
      id: 'create-mock-btn',
    }, 'Create Mock API'),
  );
}

async function handleCreateMock() {
  if (routes.length === 0) {
    showToast('Add at least one route first', 'error');
    return;
  }

  const name = document.getElementById('mock-name')?.value.trim() || '';
  const btn = document.getElementById('create-mock-btn');

  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const config = { routes };
    if (name) config.name = name;

    const result = await createMock(config);

    // Show success modal with secret
    showSecretModal(result);

  } catch (err) {
    showToast(err.message || 'Failed to create mock', 'error');
    btn.disabled = false;
    btn.textContent = 'Create Mock API';
  }
}

function showSecretModal(result) {
  // Remove existing modal
  const existing = document.getElementById('secret-modal');
  if (existing) existing.remove();

  const overlay = el('div', { className: 'modal-overlay', id: 'secret-modal' },
    el('div', { className: 'modal' },
      el('div', { className: 'modal-header' },
        el('h2', {}, 'Mock Created!'),
      ),
      el('div', { className: 'modal-body' },
        el('p', { className: 'modal-success' }, 'Your mock API is live and ready to use.'),
        el('div', { className: 'modal-field' },
          el('label', { className: 'form-label' }, 'Base URL'),
          el('div', { className: 'copy-field' },
            el('code', { className: 'code-font' }, result.base_url),
            el('button', {
              className: 'btn btn-small btn-ghost',
              onClick: () => copyToClipboard(result.base_url, 'Base URL'),
            }, 'Copy'),
          ),
        ),
        el('div', { className: 'modal-field modal-warning' },
          el('label', { className: 'form-label' }, 'Deletion Secret'),
          el('p', { className: 'warning-text' }, 'Save this secret! You need it to delete your mock. It cannot be recovered.'),
          el('div', { className: 'copy-field' },
            el('code', { className: 'code-font secret-text' }, result.secret),
            el('button', {
              className: 'btn btn-small btn-ghost',
              onClick: () => copyToClipboard(result.secret, 'Secret'),
            }, 'Copy'),
          ),
        ),
        el('p', { className: 'coffee-note' },
          'Mocklet is free forever. If it saved you time, consider ',
          el('a', { href: 'https://buymeacoffee.com/timtian', target: '_blank', rel: 'noopener' }, 'buying me a coffee'),
          '.',
        ),
      ),
      el('div', { className: 'modal-footer' },
        el('button', {
          className: 'btn btn-primary',
          onClick: () => {
            overlay.remove();
            window.location.hash = `#/mock/${result.id}`;
          },
        }, 'Go to Dashboard'),
        el('button', {
          className: 'btn btn-ghost',
          onClick: () => {
            overlay.remove();
            // Reset
            routes = [];
            editingIndex = -1;
            const nameInput = document.getElementById('mock-name');
            if (nameInput) nameInput.value = '';
            resetForm();
            updateRouteList();
            const btn = document.getElementById('create-mock-btn');
            if (btn) {
              btn.disabled = false;
              btn.textContent = 'Create Mock API';
            }
          },
        }, 'Create Another'),
      ),
    ),
  );

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      // Don't close — force user to choose an action
    }
  });

  document.body.appendChild(overlay);
}
