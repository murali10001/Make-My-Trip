# UI Interaction & Touch Guardrails

## 1. Instant Category & Tab Filtering
- For pre-fetched lists (such as personalized recommendations, catalog cards, or filterable badges), execute tab switches via memoized client-side filtering (`useMemo`).
- Avoid triggering asynchronous re-fetching with full skeleton loaders on simple category tab switches, as this creates perceived page reloads and visual stutter.

## 2. Explicit Button Typing & Event Isolation
- Always include `type="button"` on every `<button>` element that is not directly submitting a form.
- Explicitly call `e.preventDefault()` and `e.stopPropagation()` in click and touch handlers for non-submitting actions to prevent unintended form submissions, touch gesture bubbling, or page navigations.

## 3. Touch Screen & Mobile Scroll Protection
- On horizontally scrollable containers (e.g., category tab bars, tag ribbons), include `overscroll-x-contain touch-pan-x` and apply `touch-manipulation select-none` to interactive elements.
- This prevents horizontal drag gestures from triggering mobile browser pull-to-refresh, history navigation, or text selection.
