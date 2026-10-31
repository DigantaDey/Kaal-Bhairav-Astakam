'use strict';

/**
 * Tiny harness that loads index.html + data.js + app.js into jsdom and stubs
 * just enough of HTMLMediaElement for the player logic to run.
 */
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORAGE_KEY = 'kba:prefs:v1';

function createSite(options) {
  options = options || {};

  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const sources = [];
  html = html.replace(/<script src="([^"]+)"><\/script>/g, function (_match, src) {
    sources.push(src);
    return '';
  });
  // avoid network requests for fonts/QR images in the test environment
  html = html.replace(/<link[^>]*fonts\.googleapis[^>]*>/g, '');
  html = html.replace(/<link[^>]*preconnect[^>]*>/g, '');

  const dom = new JSDOM(html, {
    url: 'https://example.test/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });

  const window = dom.window;
  const document = window.document;

  if (options.seedPrefs) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options.seedPrefs));
  }

  const media = {
    paused: true,
    currentTime: 0,
    volume: 1,
    muted: false,
    loop: false,
    rate: 1,
    duration: 321
  };

  const audio = document.getElementById('audio');
  const define = function (prop, descriptor) {
    Object.defineProperty(audio, prop, Object.assign({ configurable: true }, descriptor));
  };

  define('paused', { get: function () { return media.paused; } });
  define('duration', { get: function () { return media.duration; } });
  define('currentTime', {
    get: function () { return media.currentTime; },
    set: function (value) {
      media.currentTime = value;
      audio.dispatchEvent(new window.Event('timeupdate'));
    }
  });
  define('volume', {
    get: function () { return media.volume; },
    set: function (value) {
      media.volume = value;
      audio.dispatchEvent(new window.Event('volumechange'));
    }
  });
  define('muted', {
    get: function () { return media.muted; },
    set: function (value) {
      media.muted = value;
      audio.dispatchEvent(new window.Event('volumechange'));
    }
  });
  define('loop', {
    get: function () { return media.loop; },
    set: function (value) { media.loop = value; }
  });
  define('playbackRate', {
    get: function () { return media.rate; },
    set: function (value) { media.rate = value; }
  });
  define('defaultPlaybackRate', {
    get: function () { return media.rate; },
    set: function (value) { media.rate = value; }
  });

  audio.play = function () {
    media.paused = false;
    audio.dispatchEvent(new window.Event('play'));
    return Promise.resolve();
  };
  audio.pause = function () {
    if (media.paused) { return; }
    media.paused = true;
    audio.dispatchEvent(new window.Event('pause'));
  };

  // jsdom has no layout: fake the player's box from its inline position
  const player = document.getElementById('player');
  Object.defineProperty(player, 'offsetWidth', { configurable: true, get: function () { return 600; } });
  Object.defineProperty(player, 'offsetHeight', { configurable: true, get: function () { return 90; } });
  player.getBoundingClientRect = function () {
    const left = parseFloat(player.style.left) || 0;
    const top = parseFloat(player.style.top) || 0;
    return {
      left: left, top: top, x: left, y: top,
      width: 600, height: 90,
      right: left + 600, bottom: top + 90
    };
  };

  // the site scripts, in document order
  sources.forEach(function (src) {
    window.eval(fs.readFileSync(path.join(ROOT, src), 'utf8'));
  });

  const ready = new Promise(function (resolve) {
    const finish = function () {
      window.setTimeout(function () {
        audio.dispatchEvent(new window.Event('loadedmetadata'));
        resolve();
      }, 0);
    };
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', finish, { once: true });
    } else {
      finish();
    }
  });

  return { dom: dom, window: window, document: document, audio: audio, media: media, player: player, ready: ready };
}

/** Build a PointerEvent-ish MouseEvent (jsdom has no PointerEvent constructor). */
function pointerEvent(window, type, options) {
  options = options || {};
  const event = new window.MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: options.clientX || 0,
    clientY: options.clientY || 0,
    button: options.button || 0
  });
  Object.defineProperty(event, 'pointerId', { value: options.pointerId === undefined ? 1 : options.pointerId });
  Object.defineProperty(event, 'pointerType', { value: options.pointerType || 'mouse' });
  return event;
}

/** Minimal assertion harness. */
function createReporter(label) {
  let pass = 0;
  let fail = 0;
  return {
    check: function (name, condition, extra) {
      if (condition) {
        pass += 1;
        console.log('  ok   ' + name);
      } else {
        fail += 1;
        console.log('  FAIL ' + name + (extra === undefined ? '' : '  -> ' + JSON.stringify(extra)));
      }
    },
    section: function (name) {
      console.log('\n' + name);
    },
    finish: function () {
      console.log('\n' + label + ': ' + (fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'ALL ' + pass + ' CHECKS PASSED'));
      process.exitCode = fail ? 1 : 0;
      return fail;
    },
    get passed() { return pass; },
    get failed() { return fail; }
  };
}

module.exports = { createSite: createSite, pointerEvent: pointerEvent, createReporter: createReporter, STORAGE_KEY: STORAGE_KEY, ROOT: ROOT };
