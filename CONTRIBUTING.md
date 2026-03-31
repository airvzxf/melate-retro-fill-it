# Contributing

Technical documentation for developers contributing to the Melate Retro Fill-It project.

## Architecture

This project is a **Tampermonkey userscript** (single-file JavaScript) that runs in the browser context on the Melate Retro lottery page.

### Target Page

- **URL**: `https://miloteria.mx/melate-retro`
- **Framework**: Vue.js / Nuxt.js (detected via `data-v-*` attributes and `window.__NUXT__`)
- **Purchase Page**: `https://miloteria.mx/buy` (navigated to from the selection page)

### DOM Structure

#### Number Selection Grid

Numbers 1–39 are laid out in a `<table>` with 4 columns (1–9, 10–19, 20–29, 30–39). Each number is a table cell:

```html
<td data-v-045c830e="" class="rounded-lg shadow text-center w-10 number-container hover:bg-red-100">
  <label data-v-045c830e="" class="block text-center">
    <input data-v-045c830e="" type="checkbox" hidden="hidden" value="3">
    <span data-v-045c830e="" class="text-center block number-container-number texto">3</span>
  </label>
</td>
```

**Selector to find a number**: `td.number-container input[value="${num}"]`

**Important**: The Vue click handler is on the `<label>` element, NOT the `<td>`. Clicking the `<td>` directly does **not** trigger Vue's reactive system. You must use:
```javascript
input.closest("label").click();
```

#### Action Buttons

| Button | Purpose | Selector Strategy |
|---|---|---|
| **Agregar** | Add current 6-number selection as a series | `button` with text "Agregar" |
| **Eliminar** | Remove one selected series from the table | `button` with text "Eliminar" |
| **Limpiar** | Clear all selected numbers from the grid | `button` with text "Limpiar" |
| **Comprar** | Navigate to purchase page (`/buy`) | `button` with text "Comprar" |

Buttons are found by iterating `document.querySelectorAll("button")` and matching `textContent.trim()`.

#### Combinations Table ("Mis combinaciones")

Shows added series with columns: Boleta (A–F), Combinación, Costo, Juego.

**Important**: The page has **4 tables** (number grid, combinations, próximos sorteos, resultados). Always use `.table-container table tr` to scope queries to this table only.

#### Purchase Page (`/buy`)

- "Proceder a pago" table listing all series with prices.
- **"Pagar"** button: `.primary-button.action-button`
- **"Cancelar"** button: `.danger-button.action-button`
- Clicking "Cancelar" navigates back to `/melate-retro` with series preserved.

### Script Flow

```
Page Load → Wait 1.5s → Show prompt()
                           ↓
                 Parse input (3 formats)
                           ↓
              For each series (1–6):
                 ├─ Click "Limpiar" (clear grid)
                 ├─ Click each number cell
                 └─ Click "Agregar"
                           ↓
              Validate combinations table
                           ↓
              Click "Comprar" → /buy page
                           ↓
              User clicks "Pagar" or "Cancelar"
```

### Input Parsing

Three formats supported:

1. **CSV with prefix** (8 values): First 2 values (game number, contest) are stripped.
   ```
   30,1621,3,15,23,24,28,32
   ```
2. **Arrow format**: Content between `>>` and `<<` is split by `-`.
   ```
   >>  3  -  15  -  23  -  24  -  28  -  32  <<
   ```
3. **Plain CSV** (6 values): Whitespace around commas is trimmed.
   ```
   3, 15,  23, 24, 28, 32
   ```

## Development

### Testing Locally

1. Install Tampermonkey in Firefox.
2. Create a new script and paste the contents of `melate-retro-fill.user.js`.
3. Navigate to `https://miloteria.mx/melate-retro` (logged in).
4. The prompt appears automatically.

### Console Debugging

All script output is prefixed with `[Melate Retro Fill-It]`. Open `F12` → Console to see:
- Parsed series
- Selection progress
- Validation results
- Error details

### Modifying the Script

Key constants at the top of the IIFE:

| Constant | Default | Description |
|---|---|---|
| `MAX_SERIES` | `6` | Maximum number of series (Melate Retro limit) |
| `NUMBERS_PER_SERIES` | `6` | Numbers per series |
| `MIN_NUMBER` | `1` | Minimum valid number |
| `MAX_NUMBER` | `39` | Maximum valid number |
| `DELAY_BETWEEN_ACTIONS_MS` | `400` | Delay after clearing/before adding (ms) |
| `DELAY_BETWEEN_SERIES_MS` | `800` | Delay between adding consecutive series (ms) |

### Potential DOM Changes

The site may update its Vue components. If the script stops working:

1. Check if `td.number-container` still exists.
2. Check if `input[value="N"]` is still inside the cells.
3. Check if button text has changed.
4. Check the browser console for error messages.

## Detection Considerations

The miloteria.mx site is a standard Vue/Nuxt application with no observed anti-extension or anti-automation measures. However:

- Tampermonkey injects scripts at `document-idle`, which is harder to detect than `document-start`.
- The script uses native DOM clicks (no synthetic events), which are indistinguishable from user interaction.
- If the site ever adds Tampermonkey detection, the same script can be pasted directly in the browser console as a fallback.
