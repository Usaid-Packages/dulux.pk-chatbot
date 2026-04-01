# Contributing Guidelines

This document outlines our team's code acceptance criteria and best practices for our React application. Following these
guidelines ensures consistency and maintainability across our codebase.

## Code Style and Formatting

### CSS Guidelines

- Avoid using percentage values for positioning attributes (e.g., `top`, `left`, `right`, `bottom`)

  **Reason**: Percentage-based positioning can cause unpredictable behavior depending on the parent element's
  dimensions. Using pixel values ensures more precise and consistent placement.

  ```css
  /* ❌ Don't do this */
  .element {
    position: absolute;
    top: 50%;
    left: 50%;
  }

  /* ✅ Do this instead */
  .element {
    position: absolute;
    top: 50px;
    left: 50px;
  }
  ```

### Event Handler Naming

- Use descriptive names for event handlers that indicate the action being performed
- Avoid generic names like `handle` or `handleClick`

  **Reason**: Descriptive names improve readability and make the code easier to understand, especially in larger
  codebases.

```jsx
/* ❌ Don't do this */
const handle = e => {
  // ...
};

/* ✅ Do this instead */
const handleUserProfile = e => {
  // ...
};
```

### Documentation

- Use JSDoc comments only for:
  1. Utility functions
  2. Component function declarations
- Avoid excessive documentation for self-explanatory code.

```jsx
/* ✅ Good - JSDoc for utility function */
/**
 * Formats a date string into a localized date format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
const formatDate = dateString => {
  // ...
};

/* ❌ Don't do this - over-documentation */
/**
 * useState hook to manage the state of the count
 * @param {number} count - The initial count value
 * @returns {Array} An array with the state value and a function to update it
 */
const [count, setCount] = useState(0);
```

### JSX Formatting

#### Spacing

- Don't use empty string expressions (`{''}`) to add spacing
- Use CSS margins or padding instead

```jsx
/* ❌ Don't do this */
<div>
  First Item {''} Second Item
</div>

/* ✅ Do this instead */
<div className="space-x-2">
  <span>First Item</span>
  <span>Second Item</span>
</div>
```

#### Event Handlers

- Avoiding creating `anonymous` functions

```jsx
/* ❌ Don't do this */
const handleUserAvatarItemClick = itemId => {
  //. ...
};
list.map(item => <UserAvatarItem onClick={() => handleUserAvatarItemClick(item?.id)} />);

/* ✅ Do this instead */
const handleUserAvatarItemClick = itemId => () => {
  //. ...
};
list.map(item => <UserAvatarItem onClick={handleUserAvatarItemClick(item?.id)} />);
```

#### Component Structure

- Maintain proper indentation for all JSX
- Break down complex JSX into multiple lines for readability
- Don't write static JSX in a single line without indentation

```jsx
/* ❌ Don't do this */
const Header = () => (
  <div>
    <h1>Welcome</h1>
    <nav>
      <ul>
        <li>Home</li>
        <li>About</li>
      </ul>
    </nav>
  </div>
);

/* ✅ Do this instead */
const Header = () => (
  <div>
    <h1>Welcome</h1>
    <nav>
      <ul>
        <li>Home</li>
        <li>About</li>
      </ul>
    </nav>
  </div>
);
```

## Project-Specific Additions (Keep Existing Rules)

The sections above remain valid. Add the following project-specific rules and workflow requirements as well.

### Stack and Scripts

- Stack: `Vite + React + TypeScript`
- Main scripts:
  - `yarn dev`
  - `yarn build`
  - `yarn preview`
  - `yarn lint`

### Pre-Commit and Formatting

- Husky pre-commit uses Yarn:
  - `yarn lint-staged`
- `lint-staged` runs on staged `*.{js,jsx,ts,tsx}` files:
  - `prettier --write --config ./.prettierrc`
  - `eslint --fix --config ./eslint.config.ts`
- Always stage files before committing so only intended files are processed.

### Folder Responsibilities (Mandatory)

- `src/components/ui` -> atomic UI only (no business logic)
- `src/components/forms` -> form UI typed by schemas from `src/schemas`
- `src/pages` -> page composition only (no business logic)
- `src/hooks` -> logic only (no JSX), names start with `use`
- `src/services` -> API clients only; use `axiosInstance.ts`
- `src/schemas` -> Zod schemas for form and API validation
- `src/types` -> API/shared types
- `src/utils` -> pure helpers (no React/DOM)
- `/src/data`:\*\* Data-access layer for React Query (query keys, query/mutation functions, and schema-based validation)

### React and TypeScript Rules (Mandatory)

- Use function components only.
- Keep one component per file and extract when component grows too large.
- Destructure props at the top of component.
- Add concise JSDoc for component purpose and props.
- Do not use `any`; use strict types and narrowing.
- Use `interface` for object contracts and `type` for unions/utilities.
- Avoid arrow functions directly in JSX; prefer named handlers.
- Use stable unique IDs for list keys.

### Services and Security Rules

- Do not call `axios` directly from components/pages.
- Route requests through service layer (`apiClient.ts` and `axiosInstance.ts`).
- Never commit secrets or credentials.
- Treat external input as untrusted and validate before use.
- Do not store sensitive data in browser storage.

### PR Checklist

- `yarn lint` passes
- `yarn build` passes
- No unrelated file changes in PR
- PR description includes: what changed, why, and how to test
