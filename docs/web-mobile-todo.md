# Web Mobile TODO

Scope: Web app only (`packages/apps/web`). React Native is out of scope.

Status: `[ ]` todo, `[~]` in progress, `[x]` done.

## Editor

- [x] Make the composer grid fit mobile viewports without whole-sheet horizontal scrolling.
- [x] Add a mobile-friendly sticky action area for validate/export/return actions.
- [x] Reduce editor metadata spacing and title scale on narrow screens.

## App Chrome

- [x] Compact the mobile topbar so the brand does not dominate the first viewport.
- [x] Review the sticky rail height and touch targets on small screens.

## Template And Entry Flows

- [x] Tighten mobile typography and spacing on template selection pages.
- [x] Verify custom select popovers on 390px and 360px widths.
- [x] Check quick-fill line input spacing and keyboard ergonomics.

## Verification

- [x] Capture 390px screenshots for entry, template selection, quick fill, and editor.
- [x] Capture a 360px editor screenshot with a ci template that has long lines.
- [x] Run Web build or typecheck after layout changes.
