import { api, money } from './api.js';

const DEBOUNCE_MS = 300;

const els = {
  search: document.getElementById('search'),
  genre: document.getElementById('genre'),
  sort: document.getElementById('sort'),
  inStock: document.getElementById('in-stock'),
  clear: document.getElementById('clear-filters'),
  clearEmpty: document.getElementById('clear-empty'),
  results: document.getElementById('results'),
  count: document.getElementById('result-count'),
  loading: document.getElementById('loading'),
  error: document.getElementById('error'),
  empty: document.getElementById('empty'),
};

let debounceTimer;
let requestSequence = 0;

function render(books) {
  els.results.replaceChildren();

  for (const book of books) {
    const item = document.createElement('li');

    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.href = `/book.html?id=${encodeURIComponent(book.id)}`;
    link.textContent = book.title;
    heading.append(link);

    const author = document.createElement('p');
    author.className = 'meta';
    author.textContent = `by ${book.author}`;

    const genre = document.createElement('p');
    genre.className = 'meta';
    genre.textContent = book.genre;

    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = money(book.price);

    const stock = document.createElement('span');
    stock.className = book.stock > 0 ? 'badge' : 'badge out';
    stock.textContent = book.stock > 0 ? `${book.stock} in stock` : 'Out of stock';

    item.append(heading, author, genre, price, stock);
    els.results.append(item);
  }
}

async function load() {
  // Every in-flight request carries a sequence number and only the newest one
  // is allowed to paint. Without this a slow early query can land after a fast
  // later one and overwrite it with stale results.
  const sequence = ++requestSequence;

  els.loading.hidden = false;
  els.error.hidden = true;

  try {
    const { data, meta } = await api.listBooks({
      search: els.search.value.trim(),
      genre: els.genre.value,
      sort: els.sort.value,
      inStock: els.inStock.checked,
    });

    if (sequence !== requestSequence) return;

    render(data);
    els.count.textContent = `${meta.total} ${meta.total === 1 ? 'book' : 'books'}`;
    els.empty.hidden = meta.total !== 0;
    els.results.hidden = meta.total === 0;
  } catch (error) {
    if (sequence !== requestSequence) return;
    render([]);
    els.count.textContent = '';
    els.empty.hidden = true;
    els.results.hidden = true;
    els.error.hidden = false;
    els.error.textContent = `Could not load books: ${error.message}`;
  } finally {
    if (sequence === requestSequence) els.loading.hidden = true;
  }
}

function scheduleLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(load, DEBOUNCE_MS);
}

function clearFilters() {
  els.search.value = '';
  els.genre.value = '';
  els.sort.value = 'title';
  els.inStock.checked = false;
  load();
}

async function populateGenres() {
  try {
    const { data } = await api.getMeta();
    for (const genre of data.genres) {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      els.genre.append(option);
    }
  } catch {
    // The filter still works without options; the list just falls back to all.
  }
}

els.search.addEventListener('input', scheduleLoad);
els.genre.addEventListener('change', load);
els.sort.addEventListener('change', load);
els.inStock.addEventListener('change', load);
els.clear.addEventListener('click', clearFilters);
els.clearEmpty.addEventListener('click', clearFilters);

document.getElementById('filters').addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(debounceTimer);
  load();
});

populateGenres().then(load);
