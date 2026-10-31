'use strict';

/**
 * Accessibility audit with axe-core.
 * Run with: npm run test:a11y
 */
const fs = require('fs');
const { createSite, createReporter } = require('./dom');

async function main() {
  const site = createSite();
  await site.ready;

  const { window, document } = site;

  // jsdom has no canvas; silencing it keeps the audit output readable
  window.HTMLCanvasElement.prototype.getContext = function () { return null; };

  window.eval(fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'));

  const results = await window.axe.run(document, {
    resultTypes: ['violations'],
    rules: {
      // jsdom does not compute visual styles, so contrast is verified separately
      // in the README's contrast table rather than here.
      'color-contrast': { enabled: false }
    }
  });

  const r = createReporter('a11y.test');
  r.section('axe-core');

  results.violations.forEach((violation) => {
    console.log('  [' + violation.impact + '] ' + violation.id + ' — ' + violation.help);
    violation.nodes.slice(0, 3).forEach((node) => console.log('      ' + node.html.slice(0, 120)));
  });

  r.check('no axe violations', results.violations.length === 0, results.violations.map((v) => v.id));
  r.check('page has a level-one heading', document.querySelectorAll('h1').length === 1);
  r.check('every form control has a label', Array.prototype.every.call(
    document.querySelectorAll('input, select'),
    (el) => !!(el.getAttribute('aria-label') || el.labels.length)
  ));
  r.check('every icon-only button is named', Array.prototype.every.call(
    document.querySelectorAll('button'),
    (el) => !!(el.textContent.trim() || el.getAttribute('aria-label'))
  ));

  r.finish();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
