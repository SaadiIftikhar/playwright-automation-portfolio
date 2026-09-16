import { mkdir, writeFile } from 'node:fs/promises';

// Builds the small landing page that fronts the two published Playwright
// reports, so a reviewer can read the results without cloning anything.
const commit = (process.env.GITHUB_SHA ?? '').slice(0, 7);
const repo = process.env.GITHUB_REPOSITORY ?? '';
const runId = process.env.GITHUB_RUN_ID ?? '';
const runUrl = repo && runId ? `https://github.com/${repo}/actions/runs/${runId}` : '';
const builtAt = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Test reports | PageTurn Books automation</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0;
    padding: 3rem 1.25rem;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    line-height: 1.6;
    background: #f6f7f9;
    color: #1c2129;
  }
  main { max-width: 42rem; margin: 0 auto; }
  h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
  p.lede { color: #5c6672; margin: 0 0 2rem; }
  ul { list-style: none; padding: 0; display: grid; gap: 1rem; }
  a.card {
    display: block;
    padding: 1.25rem 1.5rem;
    background: #fff;
    border: 1px solid #d8dce3;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
  }
  a.card:hover { border-color: #2b5cd9; }
  a.card strong { display: block; font-size: 1.05rem; color: #2b5cd9; }
  a.card span { color: #5c6672; font-size: 0.92rem; }
  footer { margin-top: 2.5rem; color: #5c6672; font-size: 0.88rem; }
  @media (prefers-color-scheme: dark) {
    body { background: #14171c; color: #e7eaee; }
    a.card { background: #1d2127; border-color: #2e343d; }
    p.lede, a.card span, footer { color: #9aa4b1; }
  }
</style>
</head>
<body>
<main>
  <h1>PageTurn Books &mdash; test reports</h1>
  <p class="lede">Published automatically from the latest run on <code>main</code>.</p>

  <ul>
    <li>
      <a class="card" href="./ui/index.html">
        <strong>UI test report</strong>
        <span>Playwright end-to-end suite across Chromium, Firefox and WebKit</span>
      </a>
    </li>
    <li>
      <a class="card" href="./api/index.html">
        <strong>API test report</strong>
        <span>REST contract suite with zod schema validation</span>
      </a>
    </li>
  </ul>

  <footer>
    Built ${builtAt}${commit ? ` from commit <code>${commit}</code>` : ''}.
    ${runUrl ? `<a href="${runUrl}">View the workflow run</a>.` : ''}
  </footer>
</main>
</body>
</html>
`;

await mkdir('site', { recursive: true });
await writeFile('site/index.html', html, 'utf8');
console.log('Wrote site/index.html');
