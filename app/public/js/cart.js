import { api, money } from './api.js';
import { refreshCartCount } from './nav.js';

const els = {
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  content: document.getElementById('content'),
  rows: document.getElementById('rows'),
  subtotal: document.getElementById('subtotal'),
  empty: document.getElementById('empty'),
  clear: document.getElementById('clear-cart'),
};

function render(cart) {
  els.rows.replaceChildren();

  for (const item of cart.items) {
    const row = document.createElement('tr');

    for (const text of [
      item.title,
      money(item.price),
      String(item.quantity),
      money(item.lineTotal),
    ]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    }

    const actions = document.createElement('td');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${item.title}`);
    remove.addEventListener('click', async () => {
      remove.disabled = true;
      await api.removeFromCart(item.bookId);
      await Promise.all([load(), refreshCartCount()]);
    });
    actions.append(remove);
    row.append(actions);

    els.rows.append(row);
  }

  els.subtotal.textContent = money(cart.subtotal);
  els.content.hidden = cart.items.length === 0;
  els.empty.hidden = cart.items.length > 0;
}

async function load() {
  els.error.hidden = true;

  try {
    const { data } = await api.getCart();
    render(data);
  } catch (error) {
    els.error.textContent = `Could not load your cart: ${error.message}`;
    els.error.hidden = false;
  } finally {
    els.loading.hidden = true;
  }
}

els.clear.addEventListener('click', async () => {
  els.clear.disabled = true;
  await api.clearCart();
  await Promise.all([load(), refreshCartCount()]);
  els.clear.disabled = false;
});

load();
