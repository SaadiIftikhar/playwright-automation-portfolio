# Test case inventory

Every automated test carries an ID in its title, so a case in this document and
the code that proves it stay linked. Running `npm run test:ui -- --grep BK-003`
executes exactly the case listed here.

| Prefix  | Area                                         |
| ------- | -------------------------------------------- |
| `BK-`   | Book CRUD through the UI                     |
| `CAT-`  | Catalog browsing, search, filtering, sorting |
| `VAL-`  | Form validation, negative cases              |
| `EDG-`  | Boundary values, unicode, empty states       |
| `DYN-`  | Loading states, debouncing, race conditions  |
| `CRT-`  | Cart behaviour                               |
| `A11Y-` | Accessibility, keyboard, axe-core            |
| `REG-`  | Regression cover for logged defects          |
| `API-`  | REST API and contract                        |

**Coverage:** 104 UI cases and 117 API cases. The UI figure counts each case
once; 27 of them are tagged `@core` and additionally run on Firefox and WebKit,
giving 154 UI executions per full run.

---

## UI suite

### Book CRUD

`tests/ui/specs/book-crud.spec.ts`

| ID     | Test                                                      | Browsers  |
| ------ | --------------------------------------------------------- | --------- |
| BK-001 | creates a book from the inventory form                    | all three |
| BK-002 | a newly created book appears in the public catalog        | all three |
| BK-003 | completes the full create, view, update, delete lifecycle | all three |
| BK-004 | the edit form is pre-populated with the current values    | chromium  |
| BK-005 | deleting a book asks for confirmation and removes the row | all three |
| BK-006 | cancelling the delete confirmation keeps the book         | chromium  |

### Catalog browsing

`tests/ui/specs/catalog.spec.ts`

| ID      | Test                                                 | Browsers  |
| ------- | ---------------------------------------------------- | --------- |
| CAT-001 | lists the full catalog with title, author and price  | all three |
| CAT-002 | marks out-of-stock books                             | chromium  |
| CAT-003 | searches by title                                    | all three |
| CAT-004 | searches by author                                   | chromium  |
| CAT-005 | search is case-insensitive                           | chromium  |
| CAT-006 | filters by genre                                     | all three |
| CAT-007 | hides out-of-stock books when the stock filter is on | chromium  |
| CAT-008 | sorts by price ascending and descending              | chromium  |
| CAT-009 | sorts by title in both directions                    | chromium  |
| CAT-010 | composes search, genre and stock filters             | all three |
| CAT-011 | clear filters restores the full catalog              | all three |
| CAT-012 | the result count agrees with the rendered cards      | chromium  |
| CAT-013 | a single result is described in the singular         | chromium  |
| CAT-014 | opens the detail page for a book                     | all three |

### Book form validation

`tests/ui/specs/form-validation.spec.ts`

| ID      | Test                                                       | Browsers |
| ------- | ---------------------------------------------------------- | -------- |
| VAL-001 | an empty submission reports every required field           | chromium |
| VAL-002 | a single missing field is reported on its own              | chromium |
| VAL-003 | rejects an ISBN that is not 13 digits                      | chromium |
| VAL-004 | rejects a 13 digit ISBN with the wrong prefix              | chromium |
| VAL-005 | surfaces the server duplicate-ISBN error on the ISBN field | chromium |
| VAL-006 | rejects a price below the minimum                          | chromium |
| VAL-007 | rejects a negative price                                   | chromium |
| VAL-008 | rejects a non-numeric price                                | chromium |
| VAL-009 | rejects a price with more than two decimal places          | chromium |
| VAL-010 | rejects a price above the maximum                          | chromium |
| VAL-011 | rejects a negative stock level                             | chromium |
| VAL-012 | rejects a fractional stock level                           | chromium |
| VAL-013 | rejects a published year before printing existed           | chromium |
| VAL-014 | rejects a published year in the future                     | chromium |
| VAL-015 | rejects a title over the maximum length                    | chromium |
| VAL-016 | rejects an author over the maximum length                  | chromium |
| VAL-017 | rejects a description over the maximum length              | chromium |
| VAL-018 | clears the error once the field is corrected               | chromium |
| VAL-019 | a rejected submission creates nothing                      | chromium |
| VAL-020 | field errors are announced and linked to their input       | chromium |

### Edge cases

`tests/ui/specs/edge-cases.spec.ts`

| ID      | Test                                                              | Browsers  |
| ------- | ----------------------------------------------------------------- | --------- |
| EDG-001 | accepts every field at its minimum boundary                       | chromium  |
| EDG-002 | accepts every field at its maximum boundary                       | chromium  |
| EDG-003 | rejects each field one past its maximum                           | chromium  |
| EDG-004 | round-trips emoji in the title                                    | all three |
| EDG-005 | round-trips non-Latin and accented characters                     | chromium  |
| EDG-006 | renders markup in a field as literal text                         | all three |
| EDG-007 | trims surrounding whitespace before saving                        | chromium  |
| EDG-008 | accepts a hyphenated ISBN and stores it normalised                | chromium  |
| EDG-009 | shows the empty state when nothing matches                        | all three |
| EDG-010 | treats regex metacharacters in search as literal text             | chromium  |
| EDG-011 | a search matching everything returns the whole catalog            | chromium  |
| EDG-012 | an empty catalog shows the empty state on both pages              | chromium  |
| EDG-013 | deleting the final book leaves an empty inventory                 | chromium  |
| EDG-014 | a double-clicked save creates exactly one book                    | chromium  |
| EDG-015 | a double-clicked delete removes the book once without error       | chromium  |
| EDG-016 | a book with no description falls back to placeholder text         | chromium  |
| EDG-017 | an unknown book id shows the not-found view                       | all three |
| EDG-018 | a missing id parameter shows the not-found view                   | chromium  |
| EDG-019 | filtering to a genre with no in-stock books shows the empty state | chromium  |
| EDG-020 | an out-of-stock seeded book cannot be bought but is still listed  | chromium  |

### Dynamic UI states

`tests/ui/specs/dynamic-states.spec.ts`

| ID      | Test                                                              | Browsers  |
| ------- | ----------------------------------------------------------------- | --------- |
| DYN-001 | shows the loading indicator while the catalog is in flight        | all three |
| DYN-002 | debounces typing into one request                                 | chromium  |
| DYN-003 | a slow earlier search cannot overwrite a newer one                | chromium  |
| DYN-004 | the add-to-cart button reports progress and locks while in flight | all three |
| DYN-005 | double-clicking add to cart sends a single request                | all three |
| DYN-006 | the save button reports progress and locks while saving           | chromium  |
| DYN-007 | a repeated save while one is in flight creates a single book      | chromium  |
| DYN-008 | a failing catalog request shows an error with a working retry     | all three |
| DYN-009 | the inventory table shows a loading state before it renders       | chromium  |
| DYN-010 | clearing the search box restores the full catalog                 | chromium  |
| DYN-011 | rapid filter switching settles on the last selection              | chromium  |

### Cart

`tests/ui/specs/cart.spec.ts`

| ID      | Test                                               | Browsers  |
| ------- | -------------------------------------------------- | --------- |
| CRT-001 | adds a book to the cart from the detail page       | all three |
| CRT-002 | adding the same book twice increments the quantity | all three |
| CRT-003 | adds several copies in one go                      | chromium  |
| CRT-004 | refuses to add more copies than are in stock       | chromium  |
| CRT-005 | cannot add an out-of-stock book                    | chromium  |
| CRT-006 | removing an item updates the totals                | chromium  |
| CRT-007 | clearing the cart shows the empty state            | all three |
| CRT-008 | an untouched cart starts empty                     | chromium  |
| CRT-009 | the cart count survives navigation between pages   | chromium  |
| CRT-010 | deleting a book removes it from the cart           | chromium  |

### Accessibility

`tests/ui/specs/accessibility.spec.ts`

| ID       | Test                                                         | Browsers  |
| -------- | ------------------------------------------------------------ | --------- |
| A11Y-001 | the catalog has no WCAG A or AA violations                   | all three |
| A11Y-002 | the book detail page has no WCAG A or AA violations          | chromium  |
| A11Y-003 | the inventory page has no WCAG A or AA violations            | chromium  |
| A11Y-004 | the open book dialog has no WCAG A or AA violations          | chromium  |
| A11Y-005 | the empty catalog state has no WCAG A or AA violations       | chromium  |
| A11Y-006 | every catalog control is reachable by its label              | chromium  |
| A11Y-007 | the page exposes the expected landmarks and heading level    | all three |
| A11Y-008 | a book can be created using only the keyboard                | all three |
| A11Y-009 | the catalog can be searched and opened by keyboard alone     | chromium  |
| A11Y-010 | the dialog closes on Escape and returns focus to its trigger | all three |
| A11Y-011 | the delete confirmation returns focus to the row button      | chromium  |
| A11Y-012 | tabbing never leaves the open dialog for the page behind it  | chromium  |
| A11Y-013 | status and error regions carry the right roles               | chromium  |
| A11Y-014 | the cart count is part of the link accessible name           | chromium  |

### Regressions

`tests/ui/specs/regression.spec.ts`

| ID      | Test                                                                      | Browsers |
| ------- | ------------------------------------------------------------------------- | -------- |
| REG-001 | (BUG-003) the catalog never claims more books than it shows               | chromium |
| REG-002 | (BUG-003) show more reveals the rest of the catalog                       | chromium |
| REG-003 | (BUG-003) changing a filter goes back to the first page                   | chromium |
| REG-004 | (BUG-003) a catalog that fits on one page shows no paging control         | chromium |
| REG-005 | (BUG-004) a quantity of zero is rejected instead of silently becoming one | chromium |
| REG-006 | (BUG-004) a negative quantity is rejected                                 | chromium |
| REG-007 | (BUG-004) correcting the quantity clears the error and adds to cart       | chromium |
| REG-008 | (BUG-002) the inventory toast only appears once the table is current      | chromium |
| REG-009 | (BUG-001) the server stock limit reaches the user                         | chromium |

---

## API suite

### GET /api/books

`tests/api/specs/books-read.spec.ts`

| ID      | Test                                                 |
| ------- | ---------------------------------------------------- |
| API-001 | returns the catalog in the documented list envelope  |
| API-002 | defaults to page 1 with a limit of 20                |
| API-003 | filters by a title substring                         |
| API-004 | filters by author                                    |
| API-005 | search ignores case                                  |
| API-006 | filters by genre                                     |
| API-007 | filters out books with no stock                      |
| API-008 | filters by a price range                             |
| API-009 | sorts by price in both directions                    |
| API-010 | sorts by title in both directions                    |
| API-011 | paginates the catalog                                |
| API-012 | the final page returns the remainder                 |
| API-013 | a page past the end returns an empty list, not a 404 |
| API-014 | a search with no matches returns an empty list       |
| API-015 | combines search, genre and stock filters             |

### GET /api/books/:id

`tests/api/specs/books-read.spec.ts`

| ID      | Test                                             |
| ------- | ------------------------------------------------ |
| API-016 | returns a single book in the documented envelope |
| API-017 | exposes timestamps as ISO-8601 strings           |

### POST /api/books

`tests/api/specs/books-write.spec.ts`

| ID      | Test                                                       |
| ------- | ---------------------------------------------------------- |
| API-020 | creates a book and returns 201 with a Location header      |
| API-021 | a created book is immediately readable                     |
| API-022 | normalises a hyphenated ISBN before storing it             |
| API-023 | fills in defaults for the optional fields                  |
| API-024 | trims surrounding whitespace                               |
| API-025 | sets createdAt and updatedAt to the same value on creation |

### PUT /api/books/:id

`tests/api/specs/books-write.spec.ts`

| ID      | Test                                               |
| ------- | -------------------------------------------------- |
| API-026 | replaces every field on the book                   |
| API-027 | preserves createdAt and advances updatedAt         |
| API-028 | keeping its own ISBN is not treated as a duplicate |

### PATCH /api/books/:id

`tests/api/specs/books-write.spec.ts`

| ID      | Test                              |
| ------- | --------------------------------- |
| API-029 | updates only the supplied field   |
| API-030 | can update several fields at once |

### DELETE /api/books/:id

`tests/api/specs/books-write.spec.ts`

| ID      | Test                                          |
| ------- | --------------------------------------------- |
| API-031 | removes the book and returns 204 with no body |
| API-032 | leaves the rest of the catalog intact         |

### POST /api/books validation

`tests/api/specs/books-validation.spec.ts`

| ID      | Test                                           |
| ------- | ---------------------------------------------- |
| API-040 | an empty body reports every required field     |
| API-041 | rejects a payload missing title                |
| API-041 | rejects a payload missing author               |
| API-041 | rejects a payload missing isbn                 |
| API-041 | rejects a payload missing price                |
| API-041 | rejects a payload missing stock                |
| API-041 | rejects a payload missing genre                |
| API-042 | rejects a numeric title                        |
| API-043 | rejects a price sent as a string               |
| API-044 | rejects a genre sent as an array               |
| API-045 | rejects a genre outside the allowed set        |
| API-046 | rejects a fractional stock level               |
| API-047 | rejects a malformed ISBN                       |
| API-048 | rejects a 13 digit ISBN with an invalid prefix |
| API-049 | rejects a duplicate ISBN with 409              |
| API-050 | rejects an unknown field                       |
| API-051 | reports several problems in one response       |
| API-052 | rejects a body that is an array                |
| API-053 | rejects malformed JSON with 400                |
| API-054 | rejects a non-JSON content type with 415       |
| API-055 | rejects a form-encoded body with 415           |

### PUT and PATCH validation

`tests/api/specs/books-validation.spec.ts`

| ID      | Test                                               |
| ------- | -------------------------------------------------- |
| API-056 | PUT requires the complete payload                  |
| API-057 | PATCH rejects an empty body                        |
| API-058 | PATCH validates the fields it is given             |
| API-059 | PATCH rejects an ISBN already used by another book |

### Query parameter validation

`tests/api/specs/books-validation.spec.ts`

| ID      | Test                               |
| ------- | ---------------------------------- |
| API-060 | rejects an unknown genre filter    |
| API-061 | rejects a non-numeric price filter |
| API-062 | rejects an unsupported sort field  |
| API-063 | rejects a non-boolean stock filter |
| API-064 | rejects an unknown query parameter |
| API-065 | rejects a page number below one    |
| API-066 | rejects a fractional page number   |

### Boundary values

`tests/api/specs/books-edge-cases.spec.ts`

| ID      | Test                                               |
| ------- | -------------------------------------------------- |
| API-070 | accepts every field at its minimum                 |
| API-071 | accepts every field at its maximum                 |
| API-072 | rejects a title one character past the maximum     |
| API-073 | rejects a price one cent past the maximum          |
| API-074 | rejects a price one cent below the minimum         |
| API-075 | rejects a stock level one past the maximum         |
| API-076 | rejects sub-cent price precision                   |
| API-077 | rejects a published year outside the allowed range |

### Empty and whitespace input

`tests/api/specs/books-edge-cases.spec.ts`

| ID      | Test                                           |
| ------- | ---------------------------------------------- |
| API-078 | rejects an empty title                         |
| API-079 | rejects a whitespace-only title                |
| API-080 | accepts an empty description                   |
| API-081 | accepts an explicitly null published year      |
| API-082 | accepts a stock level of zero                  |
| API-083 | an empty search term returns the whole catalog |

### Unusual content

`tests/api/specs/books-edge-cases.spec.ts`

| ID      | Test                                                   |
| ------- | ------------------------------------------------------ |
| API-084 | round-trips emoji and non-Latin characters             |
| API-085 | stores markup as literal text without escaping it      |
| API-086 | stores SQL-like input verbatim                         |
| API-087 | finds a book whose title contains regex metacharacters |

### Payload and pagination limits

`tests/api/specs/books-edge-cases.spec.ts`

| ID      | Test                                  |
| ------- | ------------------------------------- |
| API-088 | rejects an oversized payload with 413 |
| API-089 | rejects a page size of zero           |
| API-090 | rejects a page size above the maximum |
| API-091 | accepts the largest allowed page size |

### Cart API

`tests/api/specs/cart.spec.ts`

| ID      | Test                                                     |
| ------- | -------------------------------------------------------- |
| API-100 | a new tenant starts with an empty cart                   |
| API-101 | adding an item returns 201 and the updated cart          |
| API-102 | quantity defaults to one                                 |
| API-103 | adding the same book again increments the quantity       |
| API-104 | totals add up across several titles                      |
| API-105 | refuses to add more copies than are in stock             |
| API-106 | counts what is already in the cart against stock         |
| API-107 | returns 404 for a book that does not exist               |
| API-108 | rejects a missing bookId                                 |
| API-109 | rejects a zero or negative quantity                      |
| API-110 | rejects a fractional quantity                            |
| API-111 | rejects an unknown field on the cart payload             |
| API-112 | removes a single line and returns 204                    |
| API-113 | returns 404 when removing a line that is not in the cart |
| API-114 | clears the whole cart                                    |
| API-115 | clearing an already empty cart still succeeds            |
| API-116 | deleting a book drops it from the cart                   |

### Error contract

`tests/api/specs/contract.spec.ts`

| ID      | Test                                                       |
| ------- | ---------------------------------------------------------- |
| API-120 | GET of a missing book returns a well-formed 404            |
| API-121 | PUT of a missing book returns 404                          |
| API-122 | PATCH of a missing book returns 404                        |
| API-123 | DELETE of a missing book returns 404                       |
| API-124 | a missing book is reported before the payload is validated |
| API-125 | an unknown API route returns a well-formed 404             |
| API-126 | every error response shares the same envelope              |
| API-127 | successful responses are always JSON                       |
| API-128 | the server does not advertise its framework                |

### Support endpoints

`tests/api/specs/contract.spec.ts`

| ID      | Test                                                    |
| ------- | ------------------------------------------------------- |
| API-129 | the health endpoint reports status and uptime           |
| API-130 | the meta endpoint publishes the genres and field limits |
| API-131 | reset restores the seeded catalog                       |
| API-132 | reset can produce an empty catalog                      |

### Tenant isolation

`tests/api/specs/contract.spec.ts`

| ID      | Test                                                         |
| ------- | ------------------------------------------------------------ |
| API-133 | two tenants never see each other data                        |
| API-134 | a destructive reset in one tenant leaves the other untouched |
| API-135 | the resolved tenant is echoed back on the response           |
