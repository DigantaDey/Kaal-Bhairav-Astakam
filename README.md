# Kaal Bhairav Ashtakam

A quiet, readable web edition of the **Kaal Bhairav Ashtakam** — eight Sanskrit verses in praise of
Lord Kālabhairava, followed by the *phalaśruti* — with a full recitation, translations, and a design
that stays out of the way of the text.

**Live site:** [digantadey.github.io/Kaal-Bhairav-Astakam](https://digantadey.github.io/Kaal-Bhairav-Astakam/)

## Features

**Reading**

- All nine verses in Devanagari, with the verse number and *phalaśruti* marked
- Optional IAST (roman) transliteration of every verse
- English and Bengali meanings, shown one verse at a time or all at once
- Three-step text size control, for comfortable reading on any screen
- Dark "temple at midnight" theme and a warm parchment light theme
  (the system colour-scheme is respected on a first visit)
- Clean print layout — printing gives you the verses *and* the meanings, without the chrome

**Listening**

- Custom audio player with play/pause, seek, elapsed/total time, volume, playback speed (0.75×–1.5×),
  and a loop toggle
- Drag the player from anywhere on the bar — grab the grip, the title, or any empty space between the
  controls — on mouse *and* touch; it stays inside the viewport and remembers its place
- Double-click the grip to send the player back to its docked position
- Minimise it to a compact pill when you only want the text
- Lock-screen / OS media controls through the Media Session API
- Arrow-key seeking and volume, so you never have to leave the keyboard

**Throughout**

- Preferences persist in `localStorage`: language, theme, text size, transliteration, volume, speed,
  loop, minimised state and player position
- Responsive down to small phones, with safe-area padding for notched devices
- Accessible: semantic landmarks, labelled controls, visible focus rings, WCAG AA contrast in both
  themes, `prefers-reduced-motion` support, and a keyboard-shortcut reference

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| <kbd>Space</kbd> | Play / pause |
| <kbd>←</kbd> <kbd>→</kbd> | Seek back / forward 5 seconds |
| <kbd>↑</kbd> <kbd>↓</kbd> | Volume up / down |
| <kbd>M</kbd> | Mute / unmute |
| <kbd>L</kbd> | Loop the recitation |
| <kbd>H</kbd> | Minimise / restore the player |
| <kbd>?</kbd> | Show the shortcut list |

Shortcuts are ignored while typing in a field, and <kbd>Space</kbd> is left alone when a button or
link has focus so that it activates that control instead.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and all nine verses |
| `styles.css` | Design tokens, themes, layout, player styling |
| `data.js` | English and Bengali meanings |
| `app.js` | Language, preferences, player and keyboard behaviour |
| `Kaal Bhairav Ashtakam.mp3` | Recitation audio |
| `favicon.svg` | Trishul icon |
| `tests/` | jsdom behaviour tests and an axe-core accessibility audit |
| `.github/workflows/ci.yml` | CI: linting, behaviour tests and the a11y audit |

No build step and no framework — plain HTML, CSS and JavaScript. The Node packages are only needed
to run the checks.

## Development

```sh
npm install     # dev dependencies (jsdom, axe-core, html-validate, csstree-validator)
npm test        # HTML/CSS/JS lint + behaviour tests + accessibility audit
npm run serve   # http://localhost:8000
```

GitHub Actions runs the same `npm test` on every pull request.

## Run locally

Open `index.html` directly in a browser, or serve the folder so that the audio streams with range
requests:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Credits

The recitation is sourced from [this YouTube video](https://www.youtube.com/watch?v=xJyiIgAKNJA).
The verses are traditional. The English and Bengali renderings are offered as an aid to reading, not
as a scholarly edition.

## Contributing

Fork the repository and open a pull request. Corrections to the text or translations are especially
welcome.

## License

[MIT](LICENSE)
