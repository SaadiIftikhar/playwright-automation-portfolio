import { api, money } from './api.js';
import { refreshCartCount } from './nav.js';

const els = {
  loading: document.getElementById('loading'),
  content: document.getElementById('content'),
  notFound: document.getElementById('not-found'),
  title: document.getElementById('book-title'),
  author: document.getElementById('book-author'),
  genre: document.getElementById('book-genre'),
  isbn: document.getElementById('book-isbn'),
  year: document.getElementById('book-year'),
  price: document.getElementById('book-price'),
  stock: document.getElementById('book-stock'),
  description: document.getElementById('book-description'),
  form: document.getElementById('add-form'),
  quantity: document.getElementById('quantity'),
  addButton: document.getElementById('add-to-cart'),
  addStatus: document.getElementById('add-status'),
  addError: document.getElementById('add-error'),
};

const bookId = new URLSearchParams(window.location.search).get('id');
let submitting = false;

function paint(book) {
  document.title = `${book.title} | PageTurn Books`;
  els.title.textContent = book.title;
  els.author.textContent = book.author;
  els.genre.textContent = book.genre;
  els.isbn.textContent = book.isbn;
  els.year.textContent = book.publishedYear ?? 'Unknown';
  els.price.textContent = money(book.price);
  els.stock.textContent = book.stock > 0 ? `${book.stock} in stock` : 'Out of stock';
  els.stock.className = book.stock > 0 ? 'badge' : 'badge out';
  els.description.textContent = book.description || 'No description provided.';

  els.quantity.max = String(Math.max(book.stock, 1));
  els.addButton.disabled = book.stock === 0;
  if (book.stock === 0) els.addButton.textContent = 'Out of stock';
}

async function load() {
  if (!bookId) {
    els.loading.hidden = true;
    els.notFound.hidden = false;
    return;
  }

  try {
    const { data } = await api.getBook(bookId);
    paint(data);
    els.content.hidden = false;
  } catch {
    els.notFound.hidden = false;
  } finally {
    els.loading.hidden = true;
  }
}

function setBusy(busy) {
  els.addButton.disabled = busy;
  els.addButton.replaceChildren();

  if (busy) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    els.addButton.append(spinner, 'Adding…');
  } else {
    els.addButton.append('Add to cart');
  }
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Second submit while the first is still in flight is dropped, so a double
  // click can never add the same book twice.
  if (submitting) return;

  els.addStatus.hidden = true;
  els.addError.hidden = true;

  const quantity = Number(els.quantity.value.trim());
  if (!Number.isInteger(quantity) || quantity < 1) {
    els.addError.textContent = 'Quantity must be a whole number of 1 or more';
    els.addError.hidden = false;
    els.quantity.setAttribute('aria-invalid', 'true');
    els.quantity.focus();
    return;
  }
  els.quantity.setAttribute('aria-invalid', 'false');

  submitting = true;
  setBusy(true);

  try {
    await api.addToCart(bookId, quantity);
    els.addStatus.textContent = 'Added to cart';
    els.addStatus.hidden = false;
    await refreshCartCount();
  } catch (error) {
    els.addError.textContent = error.message;
    els.addError.hidden = false;
  } finally {
    submitting = false;
    setBusy(false);
  }
});

load();
