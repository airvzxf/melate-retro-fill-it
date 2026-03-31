# Melate Retro Fill-It

Automate number selection and series submission on the [Melate Retro](https://miloteria.mx/melate-retro) lottery page using a Tampermonkey/Greasemonkey userscript.

## Features

- **Auto-injects** when visiting the Melate Retro page — no need to open the developer console.
- **Three input formats** supported:
  - CSV with game/contest prefix: `30,1621,3,15,23,24,28,32`
  - Arrow format: `>>  3  -  15  -  23  -  24  -  28  -  32  <<`
  - Plain comma-separated (flexible whitespace): `3, 15,  23, 24, 28, 32`
- **1–6 series** per execution (flexible, not fixed at 6).
- **Automatic validation** — verifies the added series match the input before proceeding.
- **Auto-clicks "Comprar"** after adding and validating all series.
- **Error feedback** — validation errors shown inline in the modal and in `console.log()`.

## Prerequisites

- **Firefox** browser (or any browser supporting Tampermonkey/Greasemonkey).
- **Tampermonkey** extension installed:
  - Firefox: [Tampermonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
  - Chrome: [Tampermonkey for Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- A valid **MiLoteria** account with sufficient balance.

## Installation

1. Install the **Tampermonkey** extension in your browser.
2. Click the Tampermonkey icon in your toolbar → **Create a new script**.
3. Delete the default template content.
4. Copy the entire contents of [`melate-retro-fill.user.js`](melate-retro-fill.user.js) and paste them.
5. Press `Ctrl+S` to save the script.
6. The script is now active and will trigger automatically when you visit the Melate Retro page.

## Usage

1. **Log in** to your [MiLoteria](https://miloteria.mx/) account manually.
2. Navigate to the **Melate Retro** page: [https://miloteria.mx/melate-retro](https://miloteria.mx/melate-retro).
3. A **modal dialog with a textarea** will appear automatically after the page loads (~1.5 seconds).
4. **Paste your series** into the prompt. You can mix formats, one series per line:

   ```text
   30,1621,3,15,23,24,28,32
   30,1621,3,15,18,23,28,37
   30,1621,2,13,15,23,28,37
   ```

   Or using arrow format:

   ```text
   >>  3  -  15  -  23  -  24  -  28  -  32  <<
   >>  3  -  15  -  18  -  23  -  28  -  37  <<
   >>  2  -  13  -  15  -  23  -  28  -  37  <<
   ```

   Or plain CSV:

   ```text
   3,15,23,24,28,32
   3,15,18,23,28,37
   2,13,15,23,28,37
   ```

5. Click **Fill Series** (or press `Ctrl+Enter`). The script will:
   - Select the 6 numbers for each series.
   - Click "Agregar" to add each series.
   - Validate all series in the "Mis combinaciones" table.
   - Click "Comprar" to navigate to the purchase page.
6. On the purchase page, **review the total** and click **"Pagar"** to confirm, or **"Cancelar"** to go back.

## Input Validation

The script validates each series:

| Rule | Description |
|---|---|
| Numbers per series | Exactly 6 |
| Number range | 1–39 |
| Duplicates | Not allowed within a single series |
| Max series | 6 (Melate Retro limit) |
| Min series | 1 |

Invalid input will show an inline error in the modal with details about the problem.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Submit the series |
| `Escape` | Cancel / close the modal |

## Troubleshooting

### The modal does not appear

- Ensure Tampermonkey is enabled (click the icon → check the toggle).
- Ensure the script is enabled in Tampermonkey's dashboard.
- Refresh the page and wait ~2 seconds for the modal.

### Numbers are not being selected

- The page DOM may have changed. Open the developer console (`F12`) and check for error messages prefixed with `[Melate Retro Fill-It]`.
- Ensure you are on the correct page: `https://miloteria.mx/melate-retro`.

### Console fallback

If Tampermonkey is blocked or unavailable, you can run the script directly in the browser console:

1. Open `F12` → **Console** tab.
2. Copy and paste the contents of `melate-retro-fill.user.js` (skip the `==UserScript==` header if desired).
3. Press Enter.

## License

[GNU General Public License v3.0](LICENSE)
