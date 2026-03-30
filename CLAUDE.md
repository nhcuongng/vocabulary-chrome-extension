# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Run all tests:** `npm test` or `node --test`
- **Run a specific test file:** `node --test tests/<path-to-test>.js`
- **Build the extension:** `npm run build` (bundles content scripts and prepares the `dist/` directory)
- **Run permissions audit:** `npm run audit:permissions` (checks `manifest.json` against compliance disclosures)
- **Run quality gate:** `npm run quality:gate` (runs tests, audits permissions, and builds the extension)

**Loading the extension in Chrome:**
After running `npm run build`, load the unpacked extension from the `dist/` folder via `chrome://extensions/` (requires Developer mode).

## High-Level Architecture

The extension provides in-context English definitions via an inline popup. It follows a modular architecture separating background services, content injection, UI components, and external adapters:

- **`src/background/`**: Contains the service worker logic (`runtimeServiceWorker.js`). Listens for lookup requests from the content script and delegates data fetching to `lookupService.js`.
- **`src/content/`**: The core inline popup functionality.
  - `runtimeContentScript.js`: Main entry point injected into web pages (bundled by esbuild during the build step).
  - `selectionDetection.js`: Captures and validates user text selection.
  - `lookupFlowOrchestrator.js`: Manages the state and flow of the definition lookup.
  - `popupRenderer.js` & `popupPositioning.js`: Handles rendering and positioning the definition popup inline on the webpage.
- **`src/popup/`**: The browser action popup logic (opened by clicking the extension's toolbar icon).
- **`src/application/`**: App-level logic bridging infrastructure and UI, including view model mappers (`popupViewModelMapper.js`), telemetry (`lookupTelemetryRecorder.js`), and compliance tools.
- **`src/infrastructure/adapters/`**: Integrations with external APIs and storage, such as fetching and parsing definitions from Vocabulary.com and managing Chrome storage.
- **`src/shared/`**: Shared domain models, constants, message contracts (`lookupContract.js`), and utilities used across different execution contexts (background and content).
- **`scripts/`**: Contains build tooling. Specifically, `build-extension.mjs` handles esbuild bundling for the content script, validates `manifest.json` permissions, and outputs the final artifact to `dist/`.
