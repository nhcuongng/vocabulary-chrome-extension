---
project_name: 'vocabulary-chrome-extension'
user_name: 'Cuongnguyenhuu'
date: '2026-03-30'
sections_completed: ['technology_stack', 'critical_rules', 'usage_guidelines']
status: 'complete'
rule_count: 10
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Runtime**: Node.js (>=20)
- **Extension Platform**: Chrome Manifest V3
- **Build Tool**: esbuild (v0.20.0)
- **UI Libraries**: React 19, Tailwind CSS 4.x, DaisyUI
- **Testing**: Native Node.js test runner (`node --test`)
- **Language**: JavaScript (ESM)

## Critical Implementation Rules

### Language & Framework Patterns
- **Tagged Union Responses**: All service worker responses for the lookup flow must follow the schema: `{ status: 'success' | 'not-found' | 'error', ... }`. NEVER throw exceptions across the messaging bridge to the content script.
- **Shadow DOM Isolation**: The popup UI must be fully isolated within a Shadow DOM to prevent style leakage from or to the host website.
- **Event Propagation**: Explicitly call `stopPropagation()` on pointer events inside the popup to prevent unintended dismissal when the user interacts with the popup content.

### Testing Guidelines
- **Logic Isolation**: Keep Parser logic (HTML adapters) entirely decoupled from UI rendering to allow pure unit testing without a browser environment.
- **Dependency Injection**: Use injection for `fetch` and `chrome.storage` APIs to ensure test predictability and avoid side effects.

### Performance & Compliance
- **UI Responsiveness**: The `loading` state (Skeleton UI) must be rendered within **<200ms** of detecting a valid selection.
- **Guardrails**: Always implement a Cache-first strategy (30-day TTL) and Rate-limiting (e.g., 6 requests / 10s) before making network calls to respect `vocabulary.com` terms of service.
- **Data Privacy**: Sanitize all local telemetry payloads to ensure no PII (Personally Identifiable Information) or sensitive keys are stored.

### Code Style & Conventions
- **Naming**: Use `camelCase` for variables/functions, `PascalCase` for React components, and `kebab-case` for CSS classes and custom DOM events.
- **Organization**: Follow the modular structure: `src/background` (services), `src/content` (injection), `src/popup` (UI), `src/infrastructure` (adapters), `src/application` (mappers).

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code.
- Follow ALL rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**
- Keep this file lean and focused on agent needs.
- Update when the technology stack changes.
- Review quarterly to remove rules that become obvious over time.

Last Updated: 2026-03-30
