# Defect log

Four defects in the demo application were found while building the automated
suite. All four are fixed, and each has a regression test named after it so the
behaviour cannot quietly revert.

| ID      | Summary                                                   | Severity | Status | Regression test     |
| ------- | --------------------------------------------------------- | -------- | ------ | ------------------- |
| BUG-001 | Stock limit error never reaches the user on the book page | Major    | Fixed  | `REG-009`           |
| BUG-002 | Success message announced before the table refreshes      | Minor    | Fixed  | `REG-008`           |
| BUG-003 | Catalog reports more books than it displays               | Major    | Fixed  | `REG-001`–`REG-004` |
| BUG-004 | Invalid quantity silently coerced to 1                    | Major    | Fixed  | `REG-005`–`REG-007` |

**Environment for all reports:** PageTurn Books demo app on `localhost:3000`,
Node 24, Chromium 141 / Firefox 145 / WebKit 26.6 via Playwright.

---

## BUG-001 — Stock limit error never reaches the user on the book page

**Severity:** Major &nbsp;·&nbsp; **Priority:** High &nbsp;·&nbsp; **Status:** Fixed

### Steps to reproduce

1. Open the detail page for a book with limited stock (e.g. _Orbital Drift_, 4 in stock).
2. Set **Quantity** to `5`.
3. Press **Add to cart**.

### Expected

The request is sent, the server rejects it with `409 OUT_OF_STOCK`, and the page
shows _"Only 4 copies of 'Orbital Drift' are available"_.

### Actual

Nothing happens. No request is sent, no error appears, and the button does not
enter its loading state. The user gets no feedback at all.

### Root cause

The add-to-cart `<form>` did not carry `novalidate`, and the quantity input has
`max` set to the available stock. The browser's own constraint validation
blocked submission before the page's submit handler ran, so the server-side
stock check was never reached. The native validation bubble is also styled and
worded differently in each browser, making the behaviour inconsistent.

### Impact

The primary purchase path gives a dead button with no explanation whenever a
user asks for more copies than are in stock.

### Fix

Added `novalidate` to the form so the application owns validation, matching the
inventory form. The server response now surfaces in the page's error region.

### Notes

Found by `CRT-004`, which failed on its first run. The failure was in the
application, not the test — a useful reminder that native constraint validation
silently swallows submits and hides server-side rules.

---

## BUG-002 — Success message announced before the table refreshes

**Severity:** Minor &nbsp;·&nbsp; **Priority:** Low &nbsp;·&nbsp; **Status:** Fixed

### Steps to reproduce

1. Open **Manage inventory**.
2. Create a book.
3. Watch the table as the _"Book created"_ message appears.

### Expected

When the confirmation appears, the table already lists the new book.

### Actual

The confirmation appeared first and the table refreshed a moment later. For a
brief window the page said a book had been created while the table still showed
the old contents.

### Root cause

The submit handler called `showToast()` before `await load()`, so the message
was painted before the refreshed rows.

### Impact

Low for a human, who will not notice the gap. Higher for automation: the
confirmation is the natural signal to wait on, and anything reading the table
immediately afterwards would read stale rows. It is exactly the kind of
ordering bug that produces intermittent failures under load.

### Fix

Reordered to `await load()` then `showToast()`, so the message is only shown
once the table reflects the change.

### Notes

Surfaced during exploratory testing of the inventory page, where a row count
read straight after the confirmation was consistently one behind.

---

## BUG-003 — Catalog reports more books than it displays

**Severity:** Major &nbsp;·&nbsp; **Priority:** High &nbsp;·&nbsp; **Status:** Fixed

### Steps to reproduce

1. Seed the catalog with 25 books (any count above 20).
2. Open the catalog at `/index.html`.
3. Compare the count label with the number of cards rendered.

### Expected

Either all 25 books are shown, or the page makes clear that it is showing a
subset and offers a way to see the rest.

### Actual

The label read **"25 books"** while only **20** cards were rendered. The
remaining five were unreachable from the catalog: there was no pagination
control, and no filter combination would surface them.

### Root cause

The catalog rendered `data` from the API response but printed `meta.total`. The
API defaults to a page size of 20, so the two disagreed for any catalog larger
than one page. The frontend had no concept of pages at all.

### Impact

Silent data loss from the user's point of view. Books beyond the first 20 were
invisible and unbuyable, and the page actively misreported how much it was
showing. The bug is invisible with the seeded catalog of 12 and only appears
once real data exceeds one page — the kind of defect that ships to production.

### Fix

The label now distinguishes the two cases: _"Showing 20 of 25 books"_ when
truncated, and _"25 books"_ when the page is complete. A **Show more books**
control raises the page size, and any filter change returns to the first page.

### Notes

Found by deliberately seeding past the default page size — a case the seeded
data never exercises. Worth remembering that fixtures sized below a system's
own limits will hide the bugs at those limits.

---

## BUG-004 — Invalid quantity silently coerced to 1

**Severity:** Major &nbsp;·&nbsp; **Priority:** High &nbsp;·&nbsp; **Status:** Fixed

### Steps to reproduce

1. Open any in-stock book's detail page.
2. Set **Quantity** to `0` (or a negative number, or text).
3. Press **Add to cart**.
4. Open the cart.

### Expected

The input is rejected with a message explaining what a valid quantity is, and
nothing is added to the cart.

### Actual

The page reported _"Added to cart"_ and added **one** copy. The user asked for
zero and received one, with no indication that their input had been changed.

### Root cause

The submit handler used
`Number.isInteger(quantity) && quantity > 0 ? quantity : 1`, falling back to `1`
for any invalid value rather than rejecting it.

### Impact

The application silently substitutes its own value for the user's and then
reports success. On a checkout path this is the sort of defect that turns into
a billing dispute.

### Fix

Invalid quantities are now rejected before the request is made, with the message
_"Quantity must be a whole number of 1 or more"_ shown in the page's error
region and `aria-invalid` set on the input. Correcting the value clears the
error.

### Notes

Found by probing the input with values outside the range the happy-path tests
use. Silent coercion is easy to miss precisely because the operation appears to
succeed — worth testing for wherever a form accepts numbers.
