# Test strategy

## What is under test

PageTurn Books, a small bookstore application built for this repository. It has
an Express REST API over an in-memory store and a vanilla-JavaScript frontend
with four views: catalog, book detail, inventory management and cart.

The application exists to be tested. It was written to contain the situations
worth automating — validation, async flows with loading states, debounced
search, out-of-order responses, empty states — rather than to be a product.

## Objectives

1. Prove the core user journeys work end to end in Chromium, Firefox and WebKit.
2. Prove the API honours its contract, including how it fails.
3. Keep the suite fast and trustworthy enough to gate every pull request.
4. Leave no test that passes for the wrong reason, and none that fails at random.

## Scope

### Covered

| Area                         | Approach                                                      |
| ---------------------------- | ------------------------------------------------------------- |
| Book CRUD                    | UI end to end, plus direct API coverage of each verb          |
| Search, filter, sort, paging | UI and API, including combinations                            |
| Form validation              | Every field rule, client and server, through the UI           |
| API contract                 | Every response parsed against a zod schema                    |
| Error handling               | 400, 404, 409, 413, 415 and the shared error envelope         |
| Boundary values              | Each numeric and length limit, at the limit and one past it   |
| Unicode and markup           | Emoji, CJK, RTL, accents, HTML and SQL-like strings           |
| Async behaviour              | Loading states, debouncing, double-submit, stale responses    |
| Accessibility                | axe-core WCAG 2.1 A/AA, keyboard-only flows, focus management |
| Test isolation               | Two tenants proven unable to observe each other's data        |

### Deliberately not covered

| Area                 | Why                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Authentication       | The demo app has no user accounts, so there is nothing to test                                                                |
| Visual regression    | Screenshot baselines are brittle across the three browsers and OS font stacks; the value here would not repay the maintenance |
| Load and performance | Out of scope for a functional suite; an in-memory store would not produce meaningful numbers                                  |
| Mobile viewports     | The layout is responsive but untested at phone widths; a gap worth closing                                                    |
| Data persistence     | State is in memory by design, so there is no durability behaviour to verify                                                   |

## Risk assessment

The areas given the most attention, in order of what would hurt most if broken:

1. **Silent data loss or substitution.** Both major defects found (BUG-003,
   BUG-004) were of this kind: the application quietly showed or saved something
   other than what was asked for, while reporting success. These are the hardest
   defects to notice and the most damaging, so input handling and list rendering
   get the heaviest coverage.
2. **Validation gaps.** Anything reaching the store unvalidated corrupts it for
   every later read. Every field rule is tested at its boundary from both the UI
   and the API.
3. **Async correctness.** Debouncing, double-submit and response ordering are
   where real applications go wrong under load and where test suites go flaky.
   Covered with explicit request gating rather than timing.
4. **Cross-browser differences.** The three engines differ most around native
   form validation, `<dialog>` and focus. The core journeys run on all three.

## Test isolation

The central design decision. The backend resolves a tenant from an
`x-test-tenant` header and gives each one an independent copy of the seed data.
Every test generates its own tenant id, applied to both the browser context and
its API client.

The consequences:

- Tests never share state, so `fullyParallel` is safe everywhere.
- No reset step is needed between tests, and no test can leave debris for another.
- Any test can be run alone, in any order, repeated, or under any worker count
  and behave identically.
- Two tests can create books with the same title without colliding.

`API-133` and `API-134` assert the mechanism itself, including that a
destructive reset in one tenant leaves another untouched.

## Ground rules

- **Role-based locators.** `getByRole` and `getByLabel` throughout. One
  `data-testid` exists, on the catalog result count, which has no semantic role
  of its own. No CSS or XPath selectors are used to find interactive elements.
- **No `waitForTimeout`.** Enforced by lint (`playwright/no-wait-for-timeout`).
  Tests rely on auto-waiting assertions. Where an in-flight state must be
  observed, the test parks the request behind a gate and releases it explicitly,
  so nothing depends on a duration.
- **Set up over HTTP, assert through the UI.** Arranging state by clicking is
  slow and couples every test to unrelated screens. Tests seed with the API
  client and exercise only the behaviour they are about.
- **Assert on the contract, not on samples.** API responses are parsed against
  strict zod schemas, so an added, missing or retyped field fails the test
  rather than slipping past a spot-check.
- **Name the case.** Every test carries an ID that matches
  [TEST-CASES.md](TEST-CASES.md).

## Test levels

| Level         | Where       | Why there                                                                                                                               |
| ------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| API contract  | `tests/api` | Fastest place to cover payload permutations, error codes and schema. No browser needed, so the whole suite runs in about three seconds. |
| UI end to end | `tests/ui`  | Reserved for behaviour that only exists in the browser: rendering, validation feedback, focus, loading states, keyboard interaction.    |

Validation rules are covered at both levels on purpose. The API suite proves the
server enforces them; the UI suite proves the user is told about them. Those are
different failures with different causes.

## Cross-browser policy

Running every test on three engines triples the CI bill for little extra signal:
most failures that reproduce on WebKit also reproduce on Chromium. The suite
splits the difference:

- **Chromium** runs everything.
- **Firefox and WebKit** run the `@core` subset — the journeys and the features
  where the engines genuinely differ.

27 of the 104 UI cases are tagged `@core`, giving 154 UI executions per run.

## Flakiness policy

- `retries: 2` in CI, `0` locally, so a flake is visible while developing rather
  than masked.
- Traces on first retry, screenshots on failure, video off.
- No timing-based waits anywhere, which removes the usual source of flakes.
- A test that needs a retry to pass is treated as a defect in the test, not as
  noise to absorb.

## Entry and exit criteria

**A change is ready to merge when** lint, formatting and type checks pass, both
suites are green across all configured browsers, and any new behaviour has a
test carrying an ID recorded in `TEST-CASES.md`.

**A defect is closed when** it has an entry in
[BUG-REPORTS.md](BUG-REPORTS.md) and a regression test named after it that fails
against the old behaviour.

## Known gaps

Worth doing, not yet done:

- Mobile and tablet viewports.
- Contract tests driven from a published OpenAPI document rather than
  hand-written zod schemas.
- Sharding, once the suite outgrows its current runtime.
- A seeded-random fuzz pass over the validation rules.
