# BEHAVIORS — watt.rfenms.com

## Login (`login.html` / React `/`)
- **Interaction model:** click / keyboard (Enter on password)
- Background: `#5082cd` + `loginbg.jpg` cover
- Card: 750×450, centered, white, radius 12, shadow
- Left panel gradient `#2f58c2` → `#4874ea`
- LOGIN button gradient `#2a8eda` → `#2a48cb`, hover `#2ca4f4` → `#4c54e6`
- Checkbox custom with bootstrap-icons `\F633`
- Success: store token + menu flags, navigate to referrer or `main.html`
- Toast on validation / API message

## App shell
- Left nav 200px fixed; logo row 60px; scrollable nav without scrollbar
- Active/hover: bg `#1d2054`, accent `#7ec8ff` / `#8cd2ff`
- Submenu `.d2Nav` expands on parent active (max-height transition in JS)
- Top bar fixed, width `calc(100% - 200px)`, same navy gradient
- Mobile: overlay drawer 300px from right

## Page content
- Titles `.deskTitle`, toolbars `.deskTool` with select2 + toast UI datepicker
- Charts: ECharts / amCharts after API load
- Tables: dark theme borders via `common.css` / page CSS

## Responsive
- Login stacks at ≤700px
- App shell collapses nav behind hamburger (`.mobileOverlay`)
