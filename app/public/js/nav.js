import { api } from './api.js';

// The cart link's accessible name carries the count, so tests can assert on it
// with a role-based locator instead of reaching for a CSS selector.
export async function refreshCartCount() {
  const target = document.querySelector('[data-cart-count]');
  if (!target) return;
  try {
    const { data } = await api.getCart();
    target.textContent = `(${data.itemCount})`;
  } catch {
    target.textContent = '(0)';
  }
}

export function markCurrentPage() {
  const path = window.location.pathname.replace(/\/$/, '') || '/index.html';
  for (const link of document.querySelectorAll('.site-header a[href]')) {
    const href = link.getAttribute('href');
    if (href === path || (path === '/' && href === '/index.html')) {
      link.setAttribute('aria-current', 'page');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  markCurrentPage();
  refreshCartCount();
});
