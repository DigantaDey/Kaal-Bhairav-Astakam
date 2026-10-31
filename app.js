/* ============================================================
   Kaal Bhairav Ashtakam — behaviour
   - language switch, meanings, text size, roman transliteration
   - theme + reading preferences persisted in localStorage
   - custom accessible audio player (drag, keyboard, media session)
   ============================================================ */
(function () {
  'use strict';

  var STORAGE_KEY = 'kba:prefs:v1';
  var SIZES = [0.9, 1, 1.12, 1.26, 1.42];
  var DEFAULTS = {
    lang: 'en',
    theme: 'dark',
    size: 1,
    meanings: false,
    iast: false,
    volume: 0.9,
    muted: false,
    rate: 1,
    loop: false,
    minimized: false,
    position: null
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var clamp = function (n, min, max) { return Math.min(Math.max(n, min), max); };

  var firstVisit = true;
  var prefs = readPrefs();

  function readPrefs() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) { firstVisit = false; }
      var saved = raw ? JSON.parse(raw) : {};
      var merged = {};
      for (var key in DEFAULTS) {
        merged[key] = Object.prototype.hasOwnProperty.call(saved, key) ? saved[key] : DEFAULTS[key];
      }
      return merged;
    } catch (err) {
      var fallback = {};
      for (var k in DEFAULTS) { fallback[k] = DEFAULTS[k]; }
      return fallback;
    }
  }

  function savePrefs() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch (err) { /* private mode */ }
  }

  /* ---------------- Toast ---------------- */
  var toastEl = $('#toast');
  var toastTimer = null;
  function toast(message, duration) {
    if (!toastEl) { return; }
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, duration || 2200);
  }

  /* ---------------- Theme ---------------- */
  var themeBtn = $('#theme-toggle');
  var metaTheme = $('#meta-theme');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (metaTheme) { metaTheme.setAttribute('content', theme === 'light' ? '#f7f1e5' : '#0a090c'); }
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      themeBtn.setAttribute('title', theme === 'light' ? 'Dark theme' : 'Light theme');
    }
    prefs.theme = theme;
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(prefs.theme === 'light' ? 'dark' : 'light');
      savePrefs();
    });
  }

  /* ---------------- Language ---------------- */
  function applyLanguage(lang) {
    var table = window.VERSE_TRANSLATIONS || {};
    var list = table[lang] || table.en || [];
    $$('.meaning__text').forEach(function (el, index) {
      el.textContent = list[index] || '';
      el.setAttribute('lang', lang);
    });
    $$('[data-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-lang') === lang));
    });
    prefs.lang = lang;
  }

  $$('[data-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyLanguage(btn.getAttribute('data-lang'));
      savePrefs();
    });
  });

  /* ---------------- Meanings ---------------- */
  var meaningsToggle = $('#meanings-toggle');

  function setMeaningOpen(btn, open) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(open));
    if (panel) { panel.hidden = !open; }
  }

  function setAllMeanings(open, quiet) {
    $$('.verse__toggle').forEach(function (btn) { setMeaningOpen(btn, open); });
    if (meaningsToggle) {
      meaningsToggle.setAttribute('aria-pressed', String(open));
      var label = meaningsToggle.querySelector('span');
      if (label) { label.textContent = open ? 'Hide meanings' : 'Show meanings'; }
    }
    prefs.meanings = open;
    if (!quiet) { savePrefs(); }
  }

  if (meaningsToggle) {
    meaningsToggle.addEventListener('click', function () {
      setAllMeanings(meaningsToggle.getAttribute('aria-pressed') !== 'true');
    });
  }

  $$('.verse__toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      setMeaningOpen(btn, open);
    });
  });

  /* ---------------- Roman script ---------------- */
  var iastToggle = $('#iast-toggle');
  function setIast(on, quiet) {
    document.body.classList.toggle('show-iast', on);
    if (iastToggle) { iastToggle.setAttribute('aria-pressed', String(on)); }
    prefs.iast = on;
    if (!quiet) { savePrefs(); }
  }

  if (iastToggle) {
    iastToggle.addEventListener('click', function () {
      setIast(iastToggle.getAttribute('aria-pressed') !== 'true');
    });
  }

  /* ---------------- Text size ---------------- */
  var sizeDown = $('#size-down');
  var sizeUp = $('#size-up');

  function applySize(index) {
    prefs.size = clamp(Math.round(index), 0, SIZES.length - 1);
    document.documentElement.style.setProperty('--sa-scale', String(SIZES[prefs.size]));
    if (sizeDown) { sizeDown.disabled = prefs.size === 0; }
    if (sizeUp) { sizeUp.disabled = prefs.size === SIZES.length - 1; }
  }

  if (sizeDown) {
    sizeDown.addEventListener('click', function () { applySize(prefs.size - 1); savePrefs(); });
    sizeUp.addEventListener('click', function () { applySize(prefs.size + 1); savePrefs(); });
  }

  /* ---------------- Audio player ---------------- */
  var audio = $('#audio');
  var player = $('#player');
  var playBtn = $('#play-btn');
  var seek = $('#seek');
  var volume = $('#volume');
  var muteBtn = $('#mute-btn');
  var loopBtn = $('#loop-btn');
  var minBtn = $('#min-btn');
  var speedSel = $('#speed');
  var stateEl = $('#player-state');
  var curEl = $('#time-current');
  var durEl = $('#time-total');
  var heroPlay = $('#hero-play');

  var scrubbing = false;

  function fmt(time) {
    if (!isFinite(time) || time < 0) { return '--:--'; }
    var total = Math.round(time);
    var hours = Math.floor(total / 3600);
    var minutes = Math.floor((total % 3600) / 60);
    var seconds = total % 60;
    var ss = seconds < 10 ? '0' + seconds : String(seconds);
    if (hours > 0) {
      var mm = minutes < 10 ? '0' + minutes : String(minutes);
      return hours + ':' + mm + ':' + ss;
    }
    return minutes + ':' + ss;
  }

  function setState(text) {
    if (stateEl) { stateEl.textContent = text; }
  }

  function setProgressVisual(ratio) {
    if (!seek) { return; }
    var pct = (ratio * 100).toFixed(2) + '%';
    seek.style.setProperty('--progress', pct);
  }

  function syncProgress() {
    if (!audio || !seek) { return; }
    if (scrubbing) { return; }
    var duration = audio.duration;
    var ratio = duration && isFinite(duration) ? clamp(audio.currentTime / duration, 0, 1) : 0;
    seek.value = String(Math.round(ratio * 1000));
    setProgressVisual(ratio);
    seek.setAttribute('aria-valuetext', fmt(audio.currentTime) + ' of ' + fmt(duration));
    if (curEl) { curEl.textContent = fmt(audio.currentTime); }
  }

  function seekBy(seconds) {
    if (!audio) { return; }
    var duration = isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = clamp(audio.currentTime + seconds, 0, duration || 0);
    syncProgress();
  }

  function togglePlay() {
    if (!audio) { return; }
    if (audio.paused) {
      var attempt = audio.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function () { toast('Playback could not start.'); });
      }
    } else {
      audio.pause();
    }
  }

  function setHeroPlaying(playing) {
    if (!heroPlay) { return; }
    heroPlay.classList.toggle('is-playing', playing);
    heroPlay.setAttribute('aria-pressed', String(playing));
    var label = heroPlay.querySelector('span');
    if (label) { label.textContent = playing ? 'Pause the recitation' : 'Listen to the recitation'; }
  }

  if (playBtn) { playBtn.addEventListener('click', togglePlay); }
  if (heroPlay) {
    heroPlay.addEventListener('click', function () {
      setMinimized(false);
      if (audio.paused) { togglePlay(); }
      else { audio.pause(); }
    });
  }

  if (seek && audio) {
    seek.addEventListener('input', function () {
      scrubbing = true;
      var ratio = Number(seek.value) / 1000;
      setProgressVisual(ratio);
      var duration = isFinite(audio.duration) ? audio.duration : 0;
      var preview = ratio * duration;
      if (curEl) { curEl.textContent = fmt(preview); }
      seek.setAttribute('aria-valuetext', fmt(preview) + ' of ' + fmt(audio.duration));
    });

    var commitSeek = function () {
      if (!scrubbing) { return; }
      var duration = isFinite(audio.duration) ? audio.duration : 0;
      if (duration > 0) {
        audio.currentTime = (Number(seek.value) / 1000) * duration;
      }
      scrubbing = false;
      syncProgress();
    };

    seek.addEventListener('change', commitSeek);
    seek.addEventListener('pointerup', commitSeek);
    seek.addEventListener('keyup', commitSeek);
  }

  function updateVolumeUI() {
    if (!audio) { return; }
    var level = audio.muted ? 0 : audio.volume;
    if (volume) {
      volume.value = String(Math.round(level * 100));
      volume.style.setProperty('--progress', (level * 100).toFixed(2) + '%');
      volume.setAttribute('aria-valuetext', Math.round(level * 100) + '%');
    }
    if (muteBtn) {
      var muted = audio.muted || audio.volume === 0;
      muteBtn.classList.toggle('is-muted', muted);
      muteBtn.setAttribute('aria-pressed', String(muted));
      muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
      muteBtn.setAttribute('title', muted ? 'Unmute (M)' : 'Mute (M)');
    }
  }

  if (volume && audio) {
    volume.addEventListener('input', function () {
      var level = Number(volume.value) / 100;
      audio.volume = clamp(level, 0, 1);
      if (level > 0 && audio.muted) { audio.muted = false; }
      prefs.volume = audio.volume;
      prefs.muted = audio.muted;
      savePrefs();
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
      if (!audio) { return; }
      audio.muted = !audio.muted;
      if (!audio.muted && audio.volume === 0) {
        audio.volume = 0.5;
        prefs.volume = 0.5;
      }
      prefs.muted = audio.muted;
      savePrefs();
    });
  }

  function setLoop(on, quiet) {
    if (!audio) { return; }
    audio.loop = on;
    prefs.loop = on;
    if (loopBtn) {
      loopBtn.setAttribute('aria-pressed', String(on));
      loopBtn.setAttribute('title', on ? 'Loop is on (L)' : 'Loop (L)');
    }
    if (!quiet) {
      toast(on ? 'Loop on' : 'Loop off', 1400);
      savePrefs();
    }
  }

  if (loopBtn) { loopBtn.addEventListener('click', function () { setLoop(!audio.loop); }); }

  if (speedSel) {
    speedSel.addEventListener('change', function () {
      var rate = Number(speedSel.value) || 1;
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
      prefs.rate = rate;
      savePrefs();
    });
  }

  function setMinimized(min, quiet) {
    if (!player) { return; }
    player.classList.toggle('is-min', min);
    prefs.minimized = min;
    if (minBtn) {
      minBtn.setAttribute('aria-pressed', String(min));
      minBtn.setAttribute('aria-label', min ? 'Expand player' : 'Minimize player');
      minBtn.setAttribute('title', min ? 'Expand (H)' : 'Minimize (H)');
    }
    if (!quiet) { savePrefs(); }
  }

  if (minBtn) { minBtn.addEventListener('click', function () { setMinimized(!player.classList.contains('is-min')); }); }

  /* audio events */
  if (audio) {
    audio.addEventListener('play', function () {
      player.classList.add('is-playing');
      playBtn.setAttribute('aria-label', 'Pause');
      setHeroPlaying(true);
      setState('Playing');
    });

    audio.addEventListener('pause', function () {
      player.classList.remove('is-playing');
      playBtn.setAttribute('aria-label', 'Play');
      setHeroPlaying(false);
      setState(audio.ended ? 'Finished' : 'Paused');
    });

    audio.addEventListener('ended', function () {
      player.classList.remove('is-playing');
      setState('Finished');
    });

    audio.addEventListener('timeupdate', syncProgress);
    audio.addEventListener('seeked', syncProgress);

    var syncDuration = function () {
      if (durEl) { durEl.textContent = fmt(audio.duration); }
      syncProgress();
    };
    audio.addEventListener('loadedmetadata', syncDuration);
    audio.addEventListener('durationchange', syncDuration);

    audio.addEventListener('volumechange', updateVolumeUI);
    audio.addEventListener('ratechange', function () {
      if (speedSel) { speedSel.value = String(audio.playbackRate); }
    });

    audio.addEventListener('error', function () {
      setState('Unavailable');
      toast('The recitation audio could not be loaded.', 4000);
    });
  }

  /* Media Session (lock screen / OS controls) */
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: 'Kaal Bhairav Ashtakam',
        artist: 'Traditional recitation',
        album: 'Kāśī'
      });
      navigator.mediaSession.setActionHandler('play', function () { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('seekbackward', function (details) {
        seekBy(-((details && details.seekOffset) || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', function (details) {
        seekBy((details && details.seekOffset) || 10);
      });
      navigator.mediaSession.setActionHandler('seekto', function (details) {
        if (details && typeof details.seekTime === 'number') { audio.currentTime = details.seekTime; }
      });
    } catch (err) { /* partial Media Session support */ }
  }

  /* ---------------- Draggable player ---------------- */
  var dragState = null;
  var CONTROLS = 'button, input, select, textarea, a, [role="button"]';
  var HANDLE = '.player__grab, .player__meta';

  function positionPlayer(x, y) {
    if (!player) { return; }
    player.style.transform = 'none';
    player.style.bottom = 'auto';
    player.style.left = clamp(x, 8, Math.max(8, window.innerWidth - player.offsetWidth - 8)) + 'px';
    player.style.top = clamp(y, 8, Math.max(8, window.innerHeight - player.offsetHeight - 8)) + 'px';
  }

  function applyPosition(pos) {
    if (!player) { return; }
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
      player.style.transform = '';
      player.style.left = '';
      player.style.top = '';
      player.style.bottom = '';
      return;
    }
    positionPlayer(pos.x, pos.y);
  }

  function resetPosition(quiet) {
    if (!player) { return; }
    applyPosition(null);
    prefs.position = null;
    savePrefs();
    if (!quiet) { toast('Player position reset', 1600); }
  }

  function onDragMove(event) {
    if (!dragState || event.pointerId !== dragState.id) { return; }
    if (event.cancelable) { event.preventDefault(); }
    positionPlayer(event.clientX - dragState.dx, event.clientY - dragState.dy);
  }

  function stopDrag() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', stopDrag);
    window.removeEventListener('pointercancel', stopDrag);
    if (!dragState) { return; }
    dragState = null;
    player.classList.remove('is-dragging');
    document.documentElement.classList.remove('is-dragging-player');
    var rect = player.getBoundingClientRect();
    prefs.position = { x: rect.left, y: rect.top };
    savePrefs();
  }

  function startDrag(event) {
    if (!player || dragState) { return; }
    if (event.pointerType === 'mouse' && event.button !== 0) { return; }

    var target = event.target instanceof Element ? event.target : null;
    if (!target) { return; }

    var onHandle = !!target.closest(HANDLE);
    var onControl = !!target.closest(CONTROLS);

    /* Buttons, sliders and the speed menu keep their normal behaviour. */
    if (onControl && !onHandle) { return; }
    /* On touch, drag only from the grip or the title so page scrolling still works. */
    if (event.pointerType !== 'mouse' && !onHandle) { return; }

    var rect = player.getBoundingClientRect();
    dragState = {
      id: event.pointerId,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top
    };

    player.classList.add('is-dragging');
    document.documentElement.classList.add('is-dragging-player');
    player.style.transform = 'none';
    player.style.bottom = 'auto';
    player.style.left = rect.left + 'px';
    player.style.top = rect.top + 'px';

    /* Pointer capture keeps the drag alive over other elements; the window
       listeners keep it working where capture is unavailable. */
    try { player.setPointerCapture(event.pointerId); } catch (err) { /* noop */ }
    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);

    if (event.cancelable) { event.preventDefault(); }
  }

  if (player) {
    player.addEventListener('pointerdown', startDrag);

    var grabHandle = $('#player-grab');
    if (grabHandle) {
      grabHandle.addEventListener('dblclick', function () { resetPosition(); });
    }

    window.addEventListener('resize', function () {
      if (prefs.position) { applyPosition(prefs.position); }
    });
  }

  /* ---------------- Shortcuts dialog ---------------- */
  var dialog = $('#shortcuts');
  var helpBtn = $('#help-btn');
  var closeBtn = $('#shortcuts-close');

  function openShortcuts() {
    if (!dialog) { return; }
    if (typeof dialog.showModal === 'function') { dialog.showModal(); }
    else { dialog.setAttribute('open', ''); }
  }

  function closeShortcuts() {
    if (!dialog) { return; }
    if (typeof dialog.close === 'function') { dialog.close(); }
    else { dialog.removeAttribute('open'); }
  }

  if (helpBtn) { helpBtn.addEventListener('click', openShortcuts); }
  if (closeBtn) { closeBtn.addEventListener('click', closeShortcuts); }

  if (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) { closeShortcuts(); }
    });
  }

  /* ---------------- Keyboard ---------------- */
  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) { return; }

    var target = event.target;
    var isForm = target instanceof Element && target.closest('input, select, textarea, [contenteditable="true"]');
    if (isForm) { return; }

    if (dialog && dialog.hasAttribute('open') && typeof dialog.close !== 'function') {
      if (event.key === 'Escape') { closeShortcuts(); }
      return;
    }
    if (dialog && dialog.open) { return; }

    var onControl = target instanceof Element && target.closest('button, a');

    switch (event.key) {
      case ' ':
      case 'Spacebar':
        if (onControl) { return; }
        event.preventDefault();
        togglePlay();
        break;

      case 'ArrowRight':
        event.preventDefault();
        seekBy(5);
        break;

      case 'ArrowLeft':
        event.preventDefault();
        seekBy(-5);
        break;

      case 'ArrowUp':
        event.preventDefault();
        audio.volume = clamp(audio.volume + 0.1, 0, 1);
        audio.muted = false;
        prefs.volume = audio.volume;
        prefs.muted = false;
        savePrefs();
        toast('Volume ' + Math.round(audio.volume * 100) + '%', 1200);
        break;

      case 'ArrowDown':
        event.preventDefault();
        audio.volume = clamp(audio.volume - 0.1, 0, 1);
        prefs.volume = audio.volume;
        savePrefs();
        toast('Volume ' + Math.round(audio.volume * 100) + '%', 1200);
        break;

      case 'm':
      case 'M':
        if (onControl) { return; }
        audio.muted = !audio.muted;
        prefs.muted = audio.muted;
        savePrefs();
        toast(audio.muted ? 'Muted' : 'Unmuted', 1200);
        break;

      case 'l':
      case 'L':
        if (onControl) { return; }
        setLoop(!audio.loop);
        break;

      case 'h':
      case 'H':
        if (onControl) { return; }
        setMinimized(!player.classList.contains('is-min'));
        break;

      case '?':
        event.preventDefault();
        openShortcuts();
        break;

      default:
        break;
    }
  });

  /* ---------------- Init ---------------- */
  function init() {
    var theme = prefs.theme === 'light' ? 'light' : 'dark';
    if (firstVisit && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
    applyTheme(theme);
    applyLanguage(prefs.lang === 'bn' ? 'bn' : 'en');
    setAllMeanings(Boolean(prefs.meanings), true);
    applySize(isFinite(prefs.size) ? prefs.size : 1);
    setIast(Boolean(prefs.iast), true);

    if (audio) {
      audio.volume = clamp(Number(prefs.volume) || 0, 0, 1);
      audio.muted = Boolean(prefs.muted);
      var rate = Number(prefs.rate);
      if (!rate || rate <= 0) { rate = 1; }
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
      if (speedSel) { speedSel.value = String(rate); }
      setLoop(Boolean(prefs.loop), true);
    }

    updateVolumeUI();

    if (prefs.minimized) { setMinimized(true, true); }
    if (prefs.position) {
      window.requestAnimationFrame(function () { applyPosition(prefs.position); });
    }

    var year = $('#year');
    if (year) { year.textContent = String(new Date().getFullYear()); }

    if (durEl && audio.readyState >= 1) { durEl.textContent = fmt(audio.duration); }
    syncProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
