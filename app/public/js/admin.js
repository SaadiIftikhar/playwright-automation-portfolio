import { api, money } from './api.js';

const FIELDS = [
  'title',
  'author',
  'isbn',
  'price',
  'stock',
  'genre',
  'publishedYear',
  'description',
];

const els = {
  addButton: document.getElementById('add-book'),
  loading: document.getElementById('loading'),
  toast: document.getElementById('toast'),
  error: document.getElementById('error'),
  rows: document.getElementById('rows'),
  tableWrapper: document.getElementById('table-wrapper'),
  empty: document.getElementById('empty'),
  dialog: document.getElementById('book-dialog'),
  dialogTitle: document.getElementById('dialog-title'),
  form: document.getElementById('book-form'),
  formError: document.getElementById('form-error'),
  save: document.getElementById('save-book'),
  cancel: document.getElementById('cancel-book'),
  genreSelect: document.getElementById('f-genre'),
  confirm: document.getElementById('confirm-dialog'),
  confirmMessage: document.getElementById('confirm-message'),
  confirmDelete: document.getElementById('confirm-delete'),
  confirmCancel: document.getElementById('confirm-cancel'),
};

let limits = null;
let editingId = null;
let submitting = false;
let deleting = false;
let pendingDelete = null;
let lastTrigger = null;

const input = (field) => els.form.elements[field];
const errorSlot = (field) => document.getElementById(`e-${field}`);

function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
}

function clearFieldErrors() {
  els.formError.hidden = true;
  for (const field of FIELDS) {
    errorSlot(field).hidden = true;
    errorSlot(field).textContent = '';
    input(field).setAttribute('aria-invalid', 'false');
  }
}

function showFieldErrors(errors) {
  const unmatched = [];
  for (const [field, message] of Object.entries(errors)) {
    const slot = errorSlot(field);
    if (!slot) {
      unmatched.push(message);
      continue;
    }
    slot.textContent = message;
    slot.hidden = false;
    input(field).setAttribute('aria-invalid', 'true');
  }
  if (unmatched.length > 0) {
    els.formError.textContent = unmatched.join(' ');
    els.formError.hidden = false;
  }
  const firstField = Object.keys(errors).find((field) => input(field));
  if (firstField) input(firstField).focus();
}

// Mirrors the server rules so the user gets immediate feedback. The server is
// still the authority: duplicate ISBNs can only be detected there.
function validate(values) {
  const errors = {};
  const l = limits;

  if (!values.title) errors.title = 'Title is required';
  else if (values.title.length > l.title.max)
    errors.title = `Title must be ${l.title.max} characters or fewer`;

  if (!values.author) errors.author = 'Author is required';
  else if (values.author.length > l.author.max)
    errors.author = `Author must be ${l.author.max} characters or fewer`;

  const isbnDigits = values.isbn.replace(/[\s-]/g, '');
  if (!values.isbn) errors.isbn = 'ISBN is required';
  else if (!/^\d{13}$/.test(isbnDigits) || !/^97[89]/.test(isbnDigits))
    errors.isbn = 'ISBN must be 13 digits beginning with 978 or 979';

  if (!values.price) errors.price = 'Price is required';
  else {
    const price = Number(values.price);
    if (!Number.isFinite(price)) errors.price = 'Price must be a number';
    else if (price < l.price.min) errors.price = `Price must be at least ${l.price.min}`;
    else if (price > l.price.max) errors.price = `Price must be at most ${l.price.max}`;
    else if (Number(price.toFixed(2)) !== price)
      errors.price = 'Price must have at most 2 decimal places';
  }

  if (!values.stock) errors.stock = 'Stock is required';
  else {
    const stock = Number(values.stock);
    if (!Number.isFinite(stock)) errors.stock = 'Stock must be a number';
    else if (!Number.isInteger(stock)) errors.stock = 'Stock must be a whole number';
    else if (stock < l.stock.min) errors.stock = `Stock must be at least ${l.stock.min}`;
    else if (stock > l.stock.max) errors.stock = `Stock must be at most ${l.stock.max}`;
  }

  if (!values.genre) errors.genre = 'Genre is required';

  if (values.publishedYear) {
    const year = Number(values.publishedYear);
    if (!Number.isInteger(year)) errors.publishedYear = 'Published year must be a whole number';
    else if (year < l.publishedYear.min)
      errors.publishedYear = `Published year must be at least ${l.publishedYear.min}`;
    else if (year > l.publishedYear.max)
      errors.publishedYear = `Published year must be at most ${l.publishedYear.max}`;
  }

  if (values.description.length > l.description.max)
    errors.description = `Description must be ${l.description.max} characters or fewer`;

  return errors;
}

function readForm() {
  const values = {};
  for (const field of FIELDS) values[field] = input(field).value.trim();
  return values;
}

function toPayload(values) {
  return {
    title: values.title,
    author: values.author,
    isbn: values.isbn,
    price: Number(values.price),
    stock: Number(values.stock),
    genre: values.genre,
    description: values.description,
    publishedYear: values.publishedYear ? Number(values.publishedYear) : null,
  };
}

function renderRows(books) {
  els.rows.replaceChildren();

  for (const book of books) {
    const row = document.createElement('tr');

    for (const text of [
      book.title,
      book.author,
      book.isbn,
      book.genre,
      money(book.price),
      String(book.stock),
    ]) {
      const cell = document.createElement('td');
      cell.textContent = text;
      row.append(cell);
    }

    const actions = document.createElement('td');
    const wrapper = document.createElement('div');
    wrapper.className = 'row-actions';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'secondary';
    edit.textContent = 'Edit';
    edit.setAttribute('aria-label', `Edit ${book.title}`);
    edit.addEventListener('click', () => openDialog(book, edit));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete ${book.title}`);
    remove.addEventListener('click', () => openConfirm(book, remove));

    wrapper.append(edit, remove);
    actions.append(wrapper);
    row.append(actions);
    els.rows.append(row);
  }

  els.tableWrapper.hidden = books.length === 0;
  els.empty.hidden = books.length > 0;
}

async function load() {
  els.loading.hidden = false;
  els.error.hidden = true;

  try {
    const { data } = await api.listBooks({ limit: 100, sort: 'title' });
    renderRows(data);
  } catch (error) {
    els.error.textContent = `Could not load inventory: ${error.message}`;
    els.error.hidden = false;
  } finally {
    els.loading.hidden = true;
  }
}

function openDialog(book, trigger) {
  editingId = book?.id ?? null;
  lastTrigger = trigger ?? null;
  els.dialogTitle.textContent = book ? 'Edit book' : 'Add book';
  els.save.textContent = 'Save book';
  els.toast.hidden = true;
  clearFieldErrors();

  for (const field of FIELDS) {
    const value = book?.[field];
    input(field).value = value === null || value === undefined ? '' : String(value);
  }

  els.dialog.showModal();
  input('title').focus();
}

function closeDialog() {
  els.dialog.close();
}

function openConfirm(book, trigger) {
  pendingDelete = book;
  lastTrigger = trigger ?? null;
  els.confirmMessage.textContent = `Delete "${book.title}"? This cannot be undone.`;
  els.confirmDelete.disabled = false;
  els.confirm.showModal();
  els.confirmCancel.focus();
}

els.addButton.addEventListener('click', () => openDialog(null, els.addButton));
els.cancel.addEventListener('click', closeDialog);
els.confirmCancel.addEventListener('click', () => els.confirm.close());

// Native <dialog> handles Escape for us; this restores focus to whatever
// opened it, which Escape alone does not do.
for (const dialog of [els.dialog, els.confirm]) {
  dialog.addEventListener('close', () => {
    if (lastTrigger?.isConnected) lastTrigger.focus();
    lastTrigger = null;
  });
}

els.form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (submitting) return;

  const values = readForm();
  clearFieldErrors();

  const errors = validate(values);
  if (Object.keys(errors).length > 0) {
    showFieldErrors(errors);
    return;
  }

  submitting = true;
  els.save.disabled = true;
  els.save.textContent = 'Saving…';

  try {
    const payload = toPayload(values);
    if (editingId) await api.updateBook(editingId, payload);
    else await api.createBook(payload);

    const wasEditing = Boolean(editingId);
    closeDialog();
    // Reload before announcing, so the toast is a reliable signal that the
    // table already reflects the change.
    await load();
    showToast(wasEditing ? 'Book updated' : 'Book created');
  } catch (error) {
    const fieldErrors = error.fieldErrors?.() ?? {};
    if (Object.keys(fieldErrors).length > 0) {
      showFieldErrors(fieldErrors);
    } else {
      els.formError.textContent = error.message;
      els.formError.hidden = false;
    }
  } finally {
    submitting = false;
    els.save.disabled = false;
    els.save.textContent = 'Save book';
  }
});

els.confirmDelete.addEventListener('click', async () => {
  if (deleting || !pendingDelete) return;
  deleting = true;
  els.confirmDelete.disabled = true;

  const book = pendingDelete;
  pendingDelete = null;

  try {
    await api.deleteBook(book.id);
    els.confirm.close();
    await load();
    showToast(`Deleted "${book.title}"`);
  } catch (error) {
    els.confirm.close();
    els.error.textContent = `Could not delete the book: ${error.message}`;
    els.error.hidden = false;
  } finally {
    deleting = false;
  }
});

async function init() {
  const { data } = await api.getMeta();
  limits = data.limits;

  for (const genre of data.genres) {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    els.genreSelect.append(option);
  }

  await load();
}

init();
