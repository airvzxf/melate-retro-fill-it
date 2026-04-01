// ==UserScript==
// @name         Melate Retro Fill-It
// @namespace    https://github.com/airvzxf/melate-retro-fill-it
// @version      1.1.0
// @description  Automate number selection and series submission on Melate Retro lottery page.
// @author       airvzxf
// @match        https://miloteria.mx/melate-retro*
// @match        https://miloteria.mx/buy*
// @icon         https://miloteria.mx/favicon.ico
// @license      AGPL-3.0-or-later
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    const SCRIPT_PREFIX = "[Melate Retro Fill-It]";
    const MAX_SERIES = 6;
    const NUMBERS_PER_SERIES = 6;
    const MIN_NUMBER = 1;
    const MAX_NUMBER = 39;
    const DELAY_BETWEEN_ACTIONS_MS = 400;
    const DELAY_BETWEEN_SERIES_MS = 800;

    /**
     * Log a message to the console with the script prefix.
     * @param  {...any} args - Arguments to log.
     */
    function log(...args) {
        console.log(SCRIPT_PREFIX, ...args);
    }

    /**
     * Log an error to the console with the script prefix.
     * @param  {...any} args - Arguments to log.
     */
    function error(...args) {
        console.error(SCRIPT_PREFIX, ...args);
    }

    /**
     * Wait for a specified duration.
     * @param {number} ms - Milliseconds to wait.
     * @returns {Promise<void>}
     */
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Parse input text into an array of number arrays (series).
     * Supports three formats:
     *   1. CSV with game/contest prefix: "30,1621,3,15,23,24,28,32"
     *   2. Arrow format:                 ">>  3  -  15  -  23  -  24  -  28  -  32  <<"
     *   3. Plain comma-separated:        "3,15,23,24,28,32" or "3, 15,   23,24, 28,32"
     *
     * @param {string} rawInput - The raw text input from the user.
     * @returns {number[][]} An array of series, each containing 6 numbers.
     */
    function parseInput(rawInput) {
        const lines = rawInput
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length === 0) {
            throw new Error("Input is empty. Please provide at least one series.");
        }

        if (lines.length > MAX_SERIES) {
            throw new Error(
                `Too many series: got ${lines.length}, maximum allowed is ${MAX_SERIES}.`
            );
        }

        const allSeries = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let numbers;

            if (line.includes(">>") && line.includes("<<")) {
                // Arrow format: ">>  3  -  15  -  23  -  24  -  28  -  32  <<"
                const content = line.replace(/^.*>>/, "").replace(/<<.*$/, "");
                numbers = content
                    .split("-")
                    .map((n) => n.trim())
                    .filter((n) => n.length > 0)
                    .map(Number);
            } else if (line.includes(",")) {
                // CSV format: could be "30,1621,3,15,23,24,28,32" or "3,15,23,24,28,32"
                const parts = line
                    .split(",")
                    .map((n) => n.trim())
                    .filter((n) => n.length > 0)
                    .map(Number);

                if (parts.length === 8) {
                    // CSV with game number and contest: skip first 2 values
                    numbers = parts.slice(2);
                } else if (parts.length === NUMBERS_PER_SERIES) {
                    // Plain comma-separated: "3,15,23,24,28,32"
                    numbers = parts;
                } else {
                    throw new Error(
                        `Line ${i + 1}: Expected ${NUMBERS_PER_SERIES} or 8 comma-separated values, got ${parts.length}. Line: "${line}"`
                    );
                }
            } else {
                throw new Error(
                    `Line ${i + 1}: Unrecognized format. Line: "${line}"`
                );
            }

            // Validate the parsed numbers
            if (numbers.length !== NUMBERS_PER_SERIES) {
                throw new Error(
                    `Line ${i + 1}: Expected ${NUMBERS_PER_SERIES} numbers, got ${numbers.length}. Line: "${line}"`
                );
            }

            for (const num of numbers) {
                if (isNaN(num) || !Number.isInteger(num)) {
                    throw new Error(
                        `Line ${i + 1}: Invalid number found. Line: "${line}"`
                    );
                }
                if (num < MIN_NUMBER || num > MAX_NUMBER) {
                    throw new Error(
                        `Line ${i + 1}: Number ${num} is out of range (${MIN_NUMBER}-${MAX_NUMBER}). Line: "${line}"`
                    );
                }
            }

            // Check for duplicate numbers within the same series
            const uniqueNumbers = new Set(numbers);
            if (uniqueNumbers.size !== numbers.length) {
                throw new Error(
                    `Line ${i + 1}: Duplicate numbers found. Line: "${line}"`
                );
            }

            allSeries.push(numbers);
        }

        return allSeries;
    }

    /**
     * Find a button element by its visible text content.
     * @param {string} text - The exact text to search for.
     * @returns {HTMLButtonElement|null} The button element or null.
     */
    function findButtonByText(text) {
        const buttons = document.querySelectorAll("button");
        return (
            [...buttons].find(
                (btn) => btn.textContent.trim() === text
            ) || null
        );
    }

    /**
     * Click a number cell in the selection grid.
     * The Vue event handler is on the <label> element, not the <td>.
     * Clicking the <td> directly does NOT trigger Vue's reactive system.
     * @param {number} num - The number to select (1-39).
     * @returns {boolean} True if the number was found and clicked.
     */
    function clickNumber(num) {
        const input = document.querySelector(
            `td.number-container input[value="${num}"]`
        );
        if (!input) {
            error(`Number ${num} not found in the grid.`);
            return false;
        }
        const label = input.closest("label");
        if (!label) {
            error(`Could not find parent label for number ${num}.`);
            return false;
        }
        label.click();
        return true;
    }

    /**
     * Clear the currently selected numbers using the "Limpiar" button.
     * @returns {boolean} True if the button was found and clicked.
     */
    function clearSelectedNumbers() {
        const limpiarBtn = findButtonByText("Limpiar");
        if (!limpiarBtn) {
            error('"Limpiar" button not found.');
            return false;
        }
        limpiarBtn.click();
        return true;
    }

    /**
     * Read the current series from the "Mis combinaciones" table.
     * Uses the scoped selector ".table-container table tr" to avoid
     * matching the number grid or other tables on the page.
     * @returns {string[]} Array of combination strings (e.g., ["3-15-23-24-28-32"]).
     */
    function readCombinationsTable() {
        const rows = document.querySelectorAll(
            ".table-container table tr"
        );
        const combinations = [];
        for (const row of rows) {
            const cells = row.querySelectorAll("td");
            // The combination is typically in the second cell
            if (cells.length >= 3) {
                const combinationText = cells[1]?.textContent?.trim();
                if (combinationText && /^\d/.test(combinationText)) {
                    combinations.push(combinationText);
                }
            }
        }
        return combinations;
    }

    /**
     * Validate that the added series match the expected series.
     * @param {number[][]} expectedSeries - The series that should be in the table.
     * @returns {boolean} True if all series are present and correct.
     */
    function validateCombinations(expectedSeries) {
        const tableCombinations = readCombinationsTable();

        if (tableCombinations.length !== expectedSeries.length) {
            error(
                `Validation failed: expected ${expectedSeries.length} series, found ${tableCombinations.length} in the table.`
            );
            return false;
        }

        for (let i = 0; i < expectedSeries.length; i++) {
            // The table might sort numbers, so sort both for comparison
            const expectedSorted = [...expectedSeries[i]].sort((a, b) => a - b).join("-");
            const tableSorted = tableCombinations[i]
                .split("-")
                .map(Number)
                .sort((a, b) => a - b)
                .join("-");

            if (expectedSorted !== tableSorted) {
                error(
                    `Validation failed at series ${i + 1}: expected "${expectedSorted}", found "${tableSorted}".`
                );
                return false;
            }
        }

        log("All series validated successfully.");
        return true;
    }

    /**
     * Main automation: select numbers, add series, validate, and purchase.
     * @param {number[][]} seriesList - Array of series to add.
     */
    async function fillSeries(seriesList) {
        log(`Starting to fill ${seriesList.length} series...`);

        for (let i = 0; i < seriesList.length; i++) {
            const series = seriesList[i];
            log(`Series ${i + 1}/${seriesList.length}: [${series.join(", ")}]`);

            // Clear any currently selected numbers
            clearSelectedNumbers();
            await sleep(DELAY_BETWEEN_ACTIONS_MS);

            // Select each number in the series
            for (const num of series) {
                const clicked = clickNumber(num);
                if (!clicked) {
                    error(`Failed to select number ${num}. Aborting.`);
                    return;
                }
                await sleep(100);
            }

            await sleep(DELAY_BETWEEN_ACTIONS_MS);

            // Click "Agregar" to add the series
            const agregarBtn = findButtonByText("Agregar");
            if (!agregarBtn) {
                error('"Agregar" button not found. Aborting.');
                return;
            }
            agregarBtn.click();
            log(`Series ${i + 1} added.`);

            await sleep(DELAY_BETWEEN_SERIES_MS);
        }

        // Validate the combinations in the table
        log("Validating combinations in the table...");
        await sleep(DELAY_BETWEEN_ACTIONS_MS);
        const isValid = validateCombinations(seriesList);

        if (!isValid) {
            error("Validation failed. Please check the series manually.");
            return;
        }

        // Click "Comprar" to proceed to purchase
        log("Clicking 'Comprar' to proceed to purchase...");
        const comprarBtn = findButtonByText("Comprar");
        if (!comprarBtn) {
            error('"Comprar" button not found.');
            return;
        }
        comprarBtn.click();
        log("Navigating to purchase page. Review and click 'Pagar' to confirm, or 'Cancelar' to go back.");
    }

    /**
     * Create and display a custom modal dialog with a textarea for multi-line input.
     * Returns a Promise that resolves with the textarea content or null if cancelled.
     * @returns {Promise<string|null>}
     */
    function showInputModal() {
        return new Promise((resolve) => {
            // Overlay background
            const overlay = document.createElement("div");
            overlay.id = "melate-fill-overlay";
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Segoe UI', Arial, sans-serif;
            `;

            // Modal container
            const modal = document.createElement("div");
            modal.style.cssText = `
                background: #fff;
                border-radius: 12px;
                padding: 24px;
                width: 520px;
                max-width: 90vw;
                max-height: 90vh;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                gap: 16px;
            `;

            // Title
            const title = document.createElement("h2");
            title.textContent = "Melate Retro Fill-It";
            title.style.cssText = `
                margin: 0;
                color: #c41e3a;
                font-size: 20px;
                font-weight: 700;
                text-align: center;
            `;

            // Instructions
            const instructions = document.createElement("div");
            instructions.style.cssText = `
                font-size: 13px;
                color: #555;
                line-height: 1.5;
            `;
            instructions.innerHTML = `
                <p style="margin: 0 0 8px 0;">Paste your series below (one per line, max 6). Supported formats:</p>
                <ul style="margin: 0; padding-left: 20px; list-style: disc;">
                    <li><code>30,1621,3,15,23,24,28,32</code> — CSV with prefix</li>
                    <li><code>&gt;&gt; 3 - 15 - 23 - 24 - 28 - 32 &lt;&lt;</code> — Arrow format</li>
                    <li><code>3,15,23,24,28,32</code> — Plain CSV</li>
                </ul>
            `;

            // Textarea
            const textarea = document.createElement("textarea");
            textarea.id = "melate-fill-input";
            textarea.placeholder = "Paste your series here...";
            textarea.style.cssText = `
                width: 100%;
                height: 180px;
                border: 2px solid #ddd;
                border-radius: 8px;
                padding: 12px;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 14px;
                line-height: 1.6;
                resize: vertical;
                box-sizing: border-box;
                outline: none;
                transition: border-color 0.2s;
            `;
            textarea.addEventListener("focus", () => {
                textarea.style.borderColor = "#c41e3a";
            });
            textarea.addEventListener("blur", () => {
                textarea.style.borderColor = "#ddd";
            });

            // Button container
            const btnContainer = document.createElement("div");
            btnContainer.style.cssText = `
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            `;

            // Cancel button
            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancel";
            cancelBtn.style.cssText = `
                padding: 10px 24px;
                border: 2px solid #ccc;
                border-radius: 8px;
                background: #fff;
                color: #666;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            `;
            cancelBtn.addEventListener("mouseenter", () => {
                cancelBtn.style.borderColor = "#999";
                cancelBtn.style.color = "#333";
            });
            cancelBtn.addEventListener("mouseleave", () => {
                cancelBtn.style.borderColor = "#ccc";
                cancelBtn.style.color = "#666";
            });

            // Submit button
            const submitBtn = document.createElement("button");
            submitBtn.textContent = "Fill Series";
            submitBtn.style.cssText = `
                padding: 10px 24px;
                border: none;
                border-radius: 8px;
                background: #c41e3a;
                color: #fff;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            `;
            submitBtn.addEventListener("mouseenter", () => {
                submitBtn.style.background = "#a01830";
            });
            submitBtn.addEventListener("mouseleave", () => {
                submitBtn.style.background = "#c41e3a";
            });

            // Error display area
            const errorDiv = document.createElement("div");
            errorDiv.id = "melate-fill-error";
            errorDiv.style.cssText = `
                display: none;
                background: #fff3f3;
                border: 1px solid #e88;
                border-radius: 8px;
                padding: 10px 14px;
                color: #c00;
                font-size: 13px;
                line-height: 1.4;
            `;

            // Cleanup helper
            function cleanup() {
                overlay.remove();
            }

            // Cancel action
            cancelBtn.addEventListener("click", () => {
                cleanup();
                resolve(null);
            });

            // Submit action
            submitBtn.addEventListener("click", () => {
                const value = textarea.value.trim();
                if (value.length === 0) {
                    errorDiv.textContent = "Please paste at least one series.";
                    errorDiv.style.display = "block";
                    return;
                }

                // Validate before closing the modal
                try {
                    parseInput(value);
                    cleanup();
                    resolve(value);
                } catch (err) {
                    errorDiv.textContent = err.message;
                    errorDiv.style.display = "block";
                }
            });

            // Close on Escape key
            overlay.addEventListener("keydown", (e) => {
                if (e.key === "Escape") {
                    cleanup();
                    resolve(null);
                }
            });

            // Ctrl+Enter to submit
            textarea.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    submitBtn.click();
                }
            });

            // Assemble the modal
            btnContainer.append(cancelBtn, submitBtn);
            modal.append(title, instructions, textarea, errorDiv, btnContainer);
            overlay.append(modal);
            document.body.append(overlay);

            // Focus the textarea
            textarea.focus();
        });
    }

    /**
     * Entry point: show input modal and execute automation on the Melate Retro page.
     */
    async function main() {
        // Only run on the Melate Retro selection page, not on `/buy`
        if (window.location.pathname.includes("/buy")) {
            log("On purchase page. Waiting for user action (Pagar or Cancelar).");
            return;
        }

        log("Script loaded. Ready to automate Melate Retro number selection.");

        // Wait a moment for the page to fully render
        await sleep(1500);

        const rawInput = await showInputModal();

        if (!rawInput) {
            log("No input provided. Script cancelled.");
            return;
        }

        try {
            const seriesList = parseInput(rawInput);
            log(`Parsed ${seriesList.length} series successfully.`);
            for (let i = 0; i < seriesList.length; i++) {
                log(`  Series ${i + 1}: [${seriesList[i].join(", ")}]`);
            }
            await fillSeries(seriesList);
        } catch (err) {
            error(`Parse error: ${err.message}`);
            alert(`Melate Retro Fill-It\n\nError: ${err.message}`);
        }
    }

    main();
})();
