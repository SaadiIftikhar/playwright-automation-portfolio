import { api, money } from './api.js';

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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
  retry: document.getElementById('retry'),
  retryWrapper: document.getElementById('retry-wrapper'),
  more: document.getElementById('show-more'),
  moreWrapper: document.getElementById('show-more-wrapper'),
};

let debounceTimer;
let requestSequence = 0;
let pageSize = PAGE_SIZE;

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
  els.retryWrapper.hidden = true;

  try {
    const { data, meta } = await api.listBooks({
      search: els.search.value.trim(),
      genre: els.genre.value,
      sort: els.sort.value,
      inStock: els.inStock.checked,
      limit: pageSize,
    });

    if (sequence !== requestSequence) return;

    render(data);

    // When the catalog is longer than the page, say so rather than printing a
    // total that disagrees with the number of cards on screen.
    const truncated = meta.count < meta.total;
    els.count.textContent = truncated
      ? `Showing ${meta.count} of ${meta.total} books`
      : `${meta.total} ${meta.total === 1 ? 'book' : 'books'}`;
    els.moreWrapper.hidden = !truncated || pageSize >= MAX_PAGE_SIZE;

    els.empty.hidden = meta.total !== 0;
    els.results.hidden = meta.total === 0;
  } catch (error) {
    if (sequence !== requestSequence) return;
    render([]);
    els.count.textContent = '';
    els.empty.hidden = true;
    els.results.hidden = true;
    els.moreWrapper.hidden = true;
    els.error.hidden = false;
    els.error.textContent = `Could not load books: ${error.message}`;
    els.retryWrapper.hidden = false;
  } finally {
    if (sequence === requestSequence) els.loading.hidden = true;
  }
}

/** Any change to the filters starts again from the first page. */
function reload() {
  pageSize = PAGE_SIZE;
  return load();
}

function scheduleLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(reload, DEBOUNCE_MS);
}

function showMore() {
  pageSize = Math.min(pageSize + PAGE_SIZE, MAX_PAGE_SIZE);
  load();
}

function clearFilters() {
  els.search.value = '';
  els.genre.value = '';
  els.sort.value = 'title';
  els.inStock.checked = false;
  reload();
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
els.genre.addEventListener('change', reload);
els.sort.addEventListener('change', reload);
els.inStock.addEventListener('change', reload);
els.clear.addEventListener('click', clearFilters);
els.clearEmpty.addEventListener('click', clearFilters);
els.retry.addEventListener('click', load);
els.more.addEventListener('click', showMore);

document.getElementById('filters').addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(debounceTimer);
  reload();
});

populateGenres().then(reload);
