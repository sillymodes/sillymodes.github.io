/**
 * reviews.js — Reviews page for Mocklet
 *
 * Displays aggregate rating, star distribution, submit form, and recent reviews list.
 */

import { getReviews, submitReview } from './api.js';
import { el, showToast } from './utils.js';

let currentPage = 1;
let totalPages = 1;

/**
 * Render the full reviews page.
 */
export async function renderReviews(container) {
  container.innerHTML = '';
  currentPage = 1;

  const wrapper = el('div', { className: 'reviews-page' });
  container.appendChild(wrapper);

  // Show loading
  wrapper.appendChild(
    el('div', { className: 'loading-state' },
      el('div', { className: 'spinner' }),
      el('p', {}, 'Loading reviews...'),
    )
  );

  try {
    const data = await getReviews(1, 10);
    wrapper.innerHTML = '';
    renderPageContent(wrapper, data);
  } catch (err) {
    wrapper.innerHTML = '';
    wrapper.appendChild(
      el('div', { className: 'error-state' },
        el('h2', {}, 'Could not load reviews'),
        el('p', {}, err.message || 'An error occurred while loading reviews.'),
        el('button', {
          className: 'btn btn-primary',
          onClick: () => renderReviews(container),
        }, 'Try Again'),
      )
    );
  }
}

function renderPageContent(wrapper, data) {
  const { average_rating, total_reviews, count_by_star, reviews, page, total_pages } = data;
  currentPage = page;
  totalPages = total_pages;

  // Page title
  wrapper.appendChild(
    el('h1', { className: 'reviews-page-title' }, 'Reviews')
  );

  // Aggregate section
  wrapper.appendChild(renderAggregate(average_rating, total_reviews, count_by_star));

  // Submit form
  wrapper.appendChild(renderSubmitForm(wrapper));

  // Reviews list
  const listSection = el('div', { className: 'reviews-list-section' });
  listSection.appendChild(
    el('h2', { className: 'section-title' }, 'Recent Reviews')
  );

  const listContainer = el('div', { className: 'reviews-list', id: 'reviews-list' });
  if (reviews.length === 0) {
    listContainer.appendChild(
      el('div', { className: 'empty-state' },
        el('p', {}, 'No reviews yet. Be the first to leave one!'),
      )
    );
  } else {
    for (const review of reviews) {
      listContainer.appendChild(renderReviewCard(review));
    }
  }
  listSection.appendChild(listContainer);

  // Load more button
  if (currentPage < totalPages) {
    const loadMoreBtn = el('button', {
      className: 'btn btn-ghost btn-large reviews-load-more',
      id: 'load-more-btn',
      onClick: () => loadMoreReviews(listContainer),
    }, 'Load More Reviews');
    listSection.appendChild(loadMoreBtn);
  }

  wrapper.appendChild(listSection);
}

/**
 * Render the aggregate display section.
 */
function renderAggregate(averageRating, totalReviews, countByStar) {
  const section = el('div', { className: 'reviews-aggregate' });

  // Left: big number + stars + total
  const summary = el('div', { className: 'reviews-summary' });

  summary.appendChild(
    el('div', { className: 'reviews-avg-number' }, averageRating > 0 ? averageRating.toFixed(1) : '--')
  );

  summary.appendChild(renderStarsStatic(averageRating));

  summary.appendChild(
    el('div', { className: 'reviews-total' },
      totalReviews > 0
        ? `based on ${totalReviews} review${totalReviews !== 1 ? 's' : ''}`
        : 'No reviews yet'
    )
  );

  // Right: star distribution bars
  const distribution = el('div', { className: 'reviews-distribution' });

  for (let star = 5; star >= 1; star--) {
    const count = (countByStar && countByStar[star]) || 0;
    const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

    distribution.appendChild(
      el('div', { className: 'dist-row' },
        el('span', { className: 'dist-label' }, `${star}`),
        el('span', { className: 'dist-star' }, '\u2605'),
        el('div', { className: 'dist-bar-track' },
          el('div', {
            className: 'dist-bar-fill',
            style: { width: `${pct}%` },
          }),
        ),
        el('span', { className: 'dist-count' }, String(count)),
      )
    );
  }

  section.appendChild(summary);
  section.appendChild(distribution);

  return section;
}

/**
 * Render static stars for display.
 */
function renderStarsStatic(rating) {
  const container = el('div', { className: 'stars-static' });
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating);
    container.appendChild(
      el('span', {
        className: `star-icon ${filled ? 'star-filled' : 'star-empty'}`,
      }, '\u2605')
    );
  }
  return container;
}

/**
 * Render the submit review form.
 */
function renderSubmitForm(wrapper) {
  const section = el('div', { className: 'reviews-form-section' });

  section.appendChild(
    el('h2', { className: 'section-title' }, 'Leave a Review')
  );

  const form = el('div', { className: 'review-form' });

  // Star selector
  let selectedRating = 0;
  const starSelectorLabel = el('label', { className: 'form-label' }, 'YOUR RATING');
  const starSelector = el('div', { className: 'star-selector' });
  const starButtons = [];

  for (let i = 1; i <= 5; i++) {
    const starBtn = el('button', {
      className: 'star-btn star-empty',
      type: 'button',
      dataset: { star: String(i) },
      'aria-label': `Rate ${i} star${i > 1 ? 's' : ''}`,
      onMouseenter: () => {
        for (let j = 0; j < 5; j++) {
          starButtons[j].classList.toggle('star-hover', j < i);
        }
      },
      onMouseleave: () => {
        for (let j = 0; j < 5; j++) {
          starButtons[j].classList.remove('star-hover');
        }
      },
      onClick: () => {
        selectedRating = i;
        for (let j = 0; j < 5; j++) {
          starButtons[j].classList.toggle('star-selected', j < i);
        }
      },
    }, '\u2605');
    starButtons.push(starBtn);
    starSelector.appendChild(starBtn);
  }

  const starGroup = el('div', { className: 'form-group' }, starSelectorLabel, starSelector);
  form.appendChild(starGroup);

  // Name input
  const nameInput = el('input', {
    className: 'form-input',
    type: 'text',
    placeholder: 'Anonymous',
    maxLength: '50',
  });
  form.appendChild(
    el('div', { className: 'form-group' },
      el('label', { className: 'form-label' }, 'NAME (OPTIONAL)'),
      nameInput,
    )
  );

  // Comment textarea
  const charCounter = el('span', { className: 'char-counter' }, '200');
  const commentArea = el('textarea', {
    className: 'form-textarea',
    placeholder: 'Share your experience with Mocklet...',
    maxLength: '200',
    rows: '3',
    onInput: () => {
      const remaining = 200 - commentArea.value.length;
      charCounter.textContent = String(remaining);
      charCounter.classList.toggle('char-counter-warn', remaining <= 20);
    },
  });
  form.appendChild(
    el('div', { className: 'form-group' },
      el('div', { className: 'form-label-row' },
        el('label', { className: 'form-label' }, 'COMMENT (OPTIONAL)'),
        el('span', { className: 'form-label-hint' }, charCounter, ' chars remaining'),
      ),
      commentArea,
    )
  );

  // Submit button
  const submitBtn = el('button', {
    className: 'btn btn-primary btn-large',
    type: 'button',
    onClick: async () => {
      if (selectedRating === 0) {
        showToast('Please select a star rating.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const payload = { rating: selectedRating };
        const name = nameInput.value.trim();
        const comment = commentArea.value.trim();
        if (name) payload.name = name;
        if (comment) payload.comment = comment;

        await submitReview(payload);
        showToast('Thank you for your review!', 'success');

        // Reload the page to show updated data
        const container = wrapper.parentElement;
        await renderReviews(container);
      } catch (err) {
        showToast(err.message || 'Failed to submit review.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
      }
    },
  }, 'Submit Review');
  form.appendChild(
    el('div', { className: 'form-actions' }, submitBtn)
  );

  section.appendChild(form);
  return section;
}

/**
 * Load more reviews (pagination).
 */
async function loadMoreReviews(listContainer) {
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Loading...';
  }

  try {
    currentPage += 1;
    const data = await getReviews(currentPage, 10);
    totalPages = data.total_pages;

    for (const review of data.reviews) {
      listContainer.appendChild(renderReviewCard(review));
    }

    if (loadMoreBtn) {
      if (currentPage >= totalPages) {
        loadMoreBtn.remove();
      } else {
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More Reviews';
      }
    }
  } catch (err) {
    showToast('Failed to load more reviews.', 'error');
    if (loadMoreBtn) {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = 'Load More Reviews';
    }
  }
}

/**
 * Render a single review card.
 */
function renderReviewCard(review) {
  const card = el('div', { className: 'review-card' });

  // Header: stars + name + date
  const header = el('div', { className: 'review-card-header' });

  // Stars
  const stars = el('div', { className: 'review-card-stars' });
  for (let i = 1; i <= 5; i++) {
    stars.appendChild(
      el('span', {
        className: `star-icon-sm ${i <= review.rating ? 'star-filled' : 'star-empty'}`,
      }, '\u2605')
    );
  }
  header.appendChild(stars);

  // Name
  header.appendChild(
    el('span', { className: 'review-card-name' }, review.name || 'Anonymous')
  );

  // Date
  if (review.created) {
    const date = new Date(review.created);
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    header.appendChild(
      el('span', { className: 'review-card-date' }, formatted)
    );
  }

  card.appendChild(header);

  // Comment
  if (review.comment) {
    card.appendChild(
      el('p', { className: 'review-card-comment' }, review.comment)
    );
  }

  return card;
}
