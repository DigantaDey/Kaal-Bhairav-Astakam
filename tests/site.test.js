'use strict';

/**
 * Behaviour tests for the Kaal Bhairav Ashtakam page.
 * Run with: npm run test:behaviour
 */
const fs = require('fs');
const path = require('path');
const { createSite, pointerEvent, createReporter, STORAGE_KEY, ROOT } = require('./dom');

async function main() {
  const site = createSite();
  await site.ready;

  const { window, document, media, player, japa } = site;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));
  const key = (k) => document.body.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const stored = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
  const r = createReporter('site.test');

  r.section('Markup');
  r.check('9 verse articles', $$('.verse').length === 9);
  r.check('9 meaning panels', $$('.meaning').length === 9);
  r.check('9 verse toggles', $$('.verse__toggle').length === 9);
  r.check('every aria-controls resolves', $$('[aria-controls]').every((b) => !!document.getElementById(b.getAttribute('aria-controls'))));
  const ids = $$('[id]').map((el) => el.id);
  r.check('no duplicate ids', new Set(ids).size === ids.length);
  r.check('every <use> target exists', $$('use').every((u) => !!document.querySelector(u.getAttribute('href'))));
  r.check('audio file exists', fs.existsSync(path.join(ROOT, decodeURIComponent($('#audio').getAttribute('src')))));
  r.check('phala verse marked', $$('.verse--phala').length === 1 && $('#verse-9').classList.contains('verse--phala'));
  r.check('IAST rendered (4 lines x 9)', $$('.iast-line').length === 36);
  r.check('no <div> inside <pre>', document.querySelectorAll('pre div').length === 0);

  r.section('Language');
  const first = () => $('#meaning-1 .meaning__text');
  r.check('English meanings populated', $$('.meaning__text').every((p) => p.textContent.length > 40));
  const enText = first().textContent;
  $('[data-lang="bn"]').click();
  r.check('Bengali switch rewrites text', first().textContent !== enText && /[\u0980-\u09FF]/.test(first().textContent));
  r.check('meaning lang attribute follows', first().getAttribute('lang') === 'bn');
  r.check('pressed state follows', $('[data-lang="bn"]').getAttribute('aria-pressed') === 'true' && $('[data-lang="en"]').getAttribute('aria-pressed') === 'false');
  $('[data-lang="en"]').click();
  r.check('switch back to English', first().textContent === enText);

  r.section('Meanings and reading options');
  r.check('meanings start closed', $$('.meaning').every((m) => m.hidden));
  $('#meanings-toggle').click();
  r.check('expand all shows 9', $$('.meaning').every((m) => !m.hidden) && $$('[aria-expanded="true"].verse__toggle').length === 9);
  r.check('toggle label flips', $('#meanings-toggle span').textContent === 'Hide meanings' && $('#meanings-toggle').getAttribute('aria-pressed') === 'true');
  $$('.verse__toggle')[0].click();
  r.check('single verse collapses independently', $('#meaning-1').hidden === true && $$('.meaning').filter((m) => !m.hidden).length === 8);
  $('#meanings-toggle').click();
  r.check('collapse all hides 9', $$('.meaning').every((m) => m.hidden) && $('#meanings-toggle span').textContent === 'Show meanings');

  r.check('iast hidden by default', !document.body.classList.contains('show-iast'));
  $('#iast-toggle').click();
  r.check('iast toggle adds class', document.body.classList.contains('show-iast') && $('#iast-toggle').getAttribute('aria-pressed') === 'true');

  r.check('default size scale applied', document.documentElement.style.getPropertyValue('--sa-scale') === '1');
  $('#size-up').click();
  r.check('text size grows', parseFloat(document.documentElement.style.getPropertyValue('--sa-scale')) > 1);
  for (let i = 0; i < 6; i += 1) { $('#size-up').click(); }
  r.check('size clamps at max', $('#size-up').disabled === true);
  for (let i = 0; i < 8; i += 1) { $('#size-down').click(); }
  r.check('size clamps at min', $('#size-down').disabled === true);

  r.section('Theme');
  r.check('starts dark on a dark system', document.documentElement.getAttribute('data-theme') === 'dark');
  $('#theme-toggle').click();
  r.check('switches to light', document.documentElement.getAttribute('data-theme') === 'light');
  r.check('meta theme-color follows', $('#meta-theme').getAttribute('content') === '#f7f1e5');
  r.check('label updates', $('#theme-toggle').getAttribute('aria-label').includes('dark'));

  r.section('Audio and keyboard');
  r.check('starts paused', media.paused === true);
  r.check('default volume applied on load', Math.abs(media.volume - 0.9) < 0.001, media.volume);
  key(' ');
  r.check('space plays', media.paused === false && player.classList.contains('is-playing'));
  r.check('aria-label flips to Pause', $('#play-btn').getAttribute('aria-label') === 'Pause');
  r.check('state label says Playing', $('#player-state').textContent === 'Playing');
  r.check('hero button reflects playback', $('#hero-play').classList.contains('is-playing') && $('#hero-play span').textContent === 'Pause the recitation');
  key(' ');
  r.check('space pauses', media.paused === true && !player.classList.contains('is-playing'));
  r.check('state label says Paused', $('#player-state').textContent === 'Paused');
  r.check('hero button resets', !$('#hero-play').classList.contains('is-playing') && $('#hero-play span').textContent === 'Listen to the recitation');

  media.currentTime = 10;
  key('ArrowRight');
  r.check('right arrow seeks +5s', Math.abs(media.currentTime - 15) < 0.001, media.currentTime);
  key('ArrowLeft');
  r.check('left arrow seeks -5s', Math.abs(media.currentTime - 10) < 0.001, media.currentTime);

  const volumeBefore = media.volume;
  key('ArrowUp');
  r.check('up arrow raises volume', media.volume > volumeBefore, media.volume);
  key('m');
  r.check('M mutes', media.muted === true && $('#mute-btn').classList.contains('is-muted'));
  key('m');
  r.check('M unmutes', media.muted === false);
  key('l');
  r.check('L toggles loop', media.loop === true && $('#loop-btn').getAttribute('aria-pressed') === 'true');
  key('h');
  r.check('H minimises', player.classList.contains('is-min') && stored().minimized === true);
  key('h');
  r.check('H restores', !player.classList.contains('is-min'));
  key('?');
  r.check('? opens shortcuts dialog', $('#shortcuts').open === true);
  $('#shortcuts-close').click();
  r.check('dialog closes', $('#shortcuts').open === false);
  r.check('shortcut help lists 8 rows', $$('.shortcuts__list > div').length === 8);

  r.section('Seek and volume inputs');
  $('#seek').value = '500';
  $('#seek').dispatchEvent(new window.Event('input', { bubbles: true }));
  $('#seek').dispatchEvent(new window.Event('change', { bubbles: true }));
  r.check('seek jumps to midpoint', Math.abs(media.currentTime - media.duration / 2) < 1, media.currentTime);
  r.check('current time label', $('#time-current').textContent === '2:41', $('#time-current').textContent);
  r.check('total time shown', $('#time-total').textContent === '5:21', $('#time-total').textContent);
  $('#volume').value = '30';
  $('#volume').dispatchEvent(new window.Event('input', { bubbles: true }));
  r.check('volume slider sets volume', Math.abs(media.volume - 0.3) < 0.001, media.volume);

  r.section('Draggable player');
  const down = (el, opts) => el.dispatchEvent(pointerEvent(window, 'pointerdown', opts));
  const move = (opts) => window.dispatchEvent(pointerEvent(window, 'pointermove', opts));
  const up = (opts) => window.dispatchEvent(pointerEvent(window, 'pointerup', opts));

  down($('#player-grab'), { clientX: 100, clientY: 100 });
  r.check('pointerdown on the grip starts a drag', player.classList.contains('is-dragging'));
  r.check('player switches to a floating position', player.style.transform === 'none' && player.style.bottom === 'auto', [player.style.transform, player.style.bottom]);

  move({ clientX: 400, clientY: 300 });
  r.check('dragging moves the player', player.style.left === '300px' && player.style.top === '200px', [player.style.left, player.style.top]);

  up({});
  r.check('drag ends', !player.classList.contains('is-dragging'));
  let saved = stored();
  r.check('position is persisted', saved && saved.position && saved.position.x === 300 && saved.position.y === 200, saved && saved.position);

  const leftBefore = player.style.left;
  down($('#play-btn'), { clientX: 200, clientY: 200 });
  r.check('pressing a control does not start a drag', !player.classList.contains('is-dragging') && player.style.left === leftBefore);

  down($('.player__center'), { clientX: 200, clientY: 200, pointerType: 'touch' });
  r.check('touch on the seek area does not drag', !player.classList.contains('is-dragging'));

  down($('.player__meta'), { clientX: 200, clientY: 200, pointerType: 'touch' });
  r.check('touch on the title starts a drag', player.classList.contains('is-dragging'));
  up({});

  $('#player-grab').dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  saved = stored();
  r.check('double-click resets the position', player.style.left === '' && player.style.top === '' && saved.position === null, saved.position);

  down($('.player__center'), { clientX: 300, clientY: 300 });
  r.check('desktop drag works from the player body', player.classList.contains('is-dragging'));
  up({});

  r.section('Japa counter');
  r.check('widget markup present', !!$('#japa') && !!$('#japa-tap') && !!$('#japa-reset') && !!$('#japa-grab'));
  r.check('count starts at zero', $('#japa-num').textContent === '0' && $('#japa-meta').textContent === 'Tap to count');
  $('#japa-tap').click();
  r.check('tap increments the count', $('#japa-num').textContent === '1' && stored().japaCount === 1);
  r.check('tap button label carries the count', $('#japa-tap').getAttribute('aria-label').includes('Current count: 1'));
  r.check('live region announces the count', $('#japa-live').textContent === 'Count: 1');
  for (let i = 0; i < 53; i += 1) { $('#japa-tap').click(); }
  r.check('mid-mala progress shown', $('#japa-meta').textContent === 'Mala 1 · 54/108' && $('#japa-fill').style.width === '50%', [$('#japa-meta').textContent, $('#japa-fill').style.width]);
  for (let i = 0; i < 54; i += 1) { $('#japa-tap').click(); }
  r.check('108 completes a mala', $('#japa-num').textContent === '108' && $('#japa-meta').textContent === '1 mala done');

  $('#japa-reset').click();
  r.check('first press arms the reset', $('#japa-reset').classList.contains('is-armed') && $('#japa-num').textContent === '108');
  r.check('armed reset asks to confirm', $('#japa-reset').getAttribute('aria-label').includes('Confirm'));
  $('#japa-reset').click();
  r.check('second press resets the count', $('#japa-num').textContent === '0' && stored().japaCount === 0 && !$('#japa-reset').classList.contains('is-armed'));

  down($('#japa-grab'), { clientX: 60, clientY: 60 });
  r.check('grip pointerdown starts a japa drag', japa.classList.contains('is-dragging') && japa.style.transform === 'none');
  move({ clientX: -400, clientY: -400 });
  r.check('drag clamps to the top-left edge', japa.style.left === '8px' && japa.style.top === '8px', [japa.style.left, japa.style.top]);
  move({ clientX: 5000, clientY: 5000 });
  r.check('drag clamps to the bottom-right edge', japa.style.left === '840px' && japa.style.top === '620px', [japa.style.left, japa.style.top]);
  up({});
  r.check('japa position persisted', !japa.classList.contains('is-dragging') && stored().japaPos && stored().japaPos.x === 840 && stored().japaPos.y === 620, stored().japaPos);

  down($('#japa-tap'), { clientX: 100, clientY: 100, pointerType: 'touch' });
  r.check('touch on the count button does not drag', !japa.classList.contains('is-dragging'));
  up({});
  down($('#japa-reset'), { clientX: 100, clientY: 100 });
  r.check('pressing reset does not start a drag', !japa.classList.contains('is-dragging'));
  up({});

  const widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true, writable: true });
  window.dispatchEvent(new window.Event('resize'));
  r.check('resize pulls the widget back on screen', parseFloat(japa.style.left) <= 400 - 176 - 8, japa.style.left);
  if (widthDescriptor) { Object.defineProperty(window, 'innerWidth', widthDescriptor); }
  else { delete window.innerWidth; }
  window.dispatchEvent(new window.Event('resize'));
  r.check('viewport restore brings back the saved place', parseFloat(japa.style.left) === 840, japa.style.left);

  $('#japa-grab').dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
  r.check('double-click resets the widget position', japa.style.left === '' && japa.style.right === '' && stored().japaPos === null, stored().japaPos);

  $('#japa-tap').click();
  $('#japa-tap').click();
  $('#japa-tap').click();
  r.check('counter keeps working after a reset', $('#japa-num').textContent === '3' && stored().japaCount === 3);

  r.section('Persistence');
  saved = stored();
  r.check('prefs stored', !!saved);
  r.check('lang saved', saved && saved.lang === 'en', saved && saved.lang);
  r.check('theme saved light', saved && saved.theme === 'light');
  r.check('iast saved', saved && saved.iast === true);
  r.check('meanings saved false', saved && saved.meanings === false);
  r.check('volume saved', saved && Math.abs(saved.volume - 0.3) < 0.01, saved && saved.volume);
  r.check('japa count saved', saved && saved.japaCount === 3, saved && saved.japaCount);

  r.section('Reload with saved preferences');
  const second = createSite({ seedPrefs: saved });
  await second.ready;
  const d2 = second.document;
  r.check('theme restored light', d2.documentElement.getAttribute('data-theme') === 'light');
  r.check('roman script restored', d2.body.classList.contains('show-iast'));
  r.check('text scale restored to min', d2.documentElement.style.getPropertyValue('--sa-scale') === '0.9');
  r.check('meaning language restored', d2.querySelector('#meaning-1 .meaning__text').getAttribute('lang') === 'en');
  r.check('meaning text restored', d2.querySelector('#meaning-1 .meaning__text').textContent.length > 40);
  r.check('japa count restored', d2.querySelector('#japa-num').textContent === '3');

  r.finish();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
