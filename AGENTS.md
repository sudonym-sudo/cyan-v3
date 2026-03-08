# AGENTS.md

This file provides guidelines for agentic coding agents working in this repository.

## Project Overview

Cyanv3 is a Svelte 5 + Vite-based web application with a dark TUI aesthetic. It features a multi-tab windowing system with apps like Cyanide (games), Sulfur (chat), Flouride, and Chromium (proxy browser).

### Important: Single-File Build & about:blank Context

- The site is compiled to a **single HTML file** (using `vite-plugin-singlefile`) and embedded in an `about:blank` page or restricted environments
- This means `window.location` has `about:` protocol or `null` origin
- CORS restrictions apply; external API calls may fail without the proxy patch
- The proxy in `main.js` patches `fetch` and `XMLHttpRequest` to route through EpoxyTransport for restricted environments
- Be mindful of: `localStorage` (may not persist), `window.open()`, and certain browser APIs that require secure contexts

## Build Commands

```bash
# Development server
npm run dev

# Production build (outputs to dist/)
npm run build

# Preview production build locally
npm run preview
```

## Test Commands

No test framework is currently configured. To add tests:
- Install vitest: `npm install -D vitest`
- Run single test: `npx vitest run src/path/to/test.ts`
- Run all tests: `npx vitest run`
- Watch mode: `npx vitest`

## Code Style Guidelines

### General

- **Language**: TypeScript with Svelte 5 (runes mode)
- **Modules**: ES modules (`"type": "module"` in package.json)
- **Indentation**: 4 spaces
- **Quotes**: Single quotes for strings, double quotes for HTML attributes
- **Semicolons**: Optional but be consistent within a file

### Imports

```typescript
// Order: external libs -> svelte imports -> internal modules -> styles
import { writable } from 'svelte/store';
import { onMount } from 'svelte';
import { windows } from './windows';
import './app.css';

// Use explicit .svelte extension for Svelte component imports
import Home from './Home.svelte';
```

### Naming Conventions

- **Components**: PascalCase (e.g., `GameCard.svelte`, `Sidebar.svelte`)
- **Stores/Files**: camelCase (e.g., `windows.js`, `stores.ts`)
- **Variables/Functions**: camelCase
- **CSS Variables**: kebab-case with `--` prefix (e.g., `--bg-color`)
- **Types/Interfaces**: PascalCase (e.g., `WindowState`, `ChatConfig`)

### Svelte Conventions

```svelte
<script lang="ts">
    // Use TypeScript in Svelte components
    import { onMount } from 'svelte';
    
    // Props with TypeScript types
    let { windowId, gameTitleContext }: { windowId: number; gameTitleContext?: string } = $props();
    
    // Reactive state
    let isActive = $state(false);
    
    // Derived values
    let displayName = $derived(formatName(name));
</script>
```

### CSS/Styling

- Use CSS variables from `app.css` for consistency
- Component-scoped styles in `<style>` blocks
- Global styles only in `app.css` using `:global()`
- Prefer flexbox/grid for layout
- Dark theme is the only theme (defined in `app.css`)

```css
/* Component styles */
.container {
    background-color: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
}

/* Global override */
:global(body) {
    background-color: var(--bg-color);
}
```

### Error Handling

```typescript
// Use try/catch for async operations
try {
    const response = await fetch(url);
    const data = await response.json();
} catch (error) {
    console.error('[component] operation failed:', error);
    // Provide fallback UI or state
}

// Log with component/module prefix for debugging
console.log('[proxy] initializing transport...');
console.error('[firebase] connection failed:', error);
```

### TypeScript Guidelines

- Enable `checkJs` in jsconfig.json for JS files
- Use explicit types for function parameters and return values
- Type reactive state in Svelte 5: `let count: number = $state(0)`
- Define interfaces for complex objects

```typescript
// Store type definition example
interface Chat {
    chatId: string;
    name: string;
    type: 'public' | 'private';
    key?: string;
}

export const activeChat = writable<Chat | null>({
    chatId: 'global',
    name: 'Global',
    type: 'public'
});
```

### File Organization

```
src/
├── *.svelte          # Svelte components (PascalCase)
├── *.ts              # TypeScript modules (camelCase)
├── *.js              # JavaScript modules (camelCase)
├── app.css           # Global styles and CSS variables
├── main.js           # App entry point
├── stores.ts         # Svelte stores
└── windows.js        # Window state management
```

### Event Handling

```svelte
<!-- Use Svelte 5 event forwarding -->
<button on:click={handleClick}>

<!-- Custom events with dispatch -->
<Home on:launch={(e) => handleLaunch(tab.id, e.detail.appId)} />

<!-- Or use callbacks for child-to-parent communication -->
<Home onLaunch={handleLaunch} />
```

### State Management

- Use Svelte stores for global state (`stores.ts`, `windows.js`)
- Use component-level state (`$state`) for local UI state
- Prefer derived state (`$derived`) over computed values

### Git Conventions

- Do not commit unless explicitly asked
- Never commit `.env` files or secrets
- Keep commits focused on single concerns

### Security Notes

- Firebase config is public (client-side)
- Proxy logic patches fetch/XHR for restricted environments
- Be careful with eval() or dynamic code execution
