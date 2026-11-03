# Running the StickSmart Frontend

> The product UI is branded **StickSmart** (the name from the final Figma);
> **TripleThr3at** is the team / repo name.

The frontend is plain **HTML5 + CSS + vanilla JS** (no framework, no build
step). You just need a static file server — because the app uses ES modules
(`<script type="module">`), it must be served over **http://**, not opened as a
`file://` path.

Pick any one of the options below.

## Option A — Python (no install needed)

Python 3 ships with a built-in server. From the **repo root**:

```bash
python3 -m http.server 8000 --directory frontend
```

Then open <http://localhost:8000> in your browser.

Stop it with `Ctrl+C`.

## Option B — Node (if you prefer npm)

From the **repo root**:

```bash
npx serve frontend
```

`npx` will print the local URL (usually <http://localhost:3000>). The first run
downloads the `serve` package.

## Option C — VS Code Live Server

1. Install the **Live Server** extension.
2. Open `frontend/index.html`.
3. Click **Go Live** in the status bar (bottom-right).

This also gives you auto-reload on save.

## What you should see

- Lands on the **Home / Welcome** screen ("Smarter hockey training") as a
  **Guest**.
- A navy **left sidebar** (StickSmart brand + Home · Training · Progress ·
  Profile). Settings live inside Profile.
- On a narrow window (<768px) the sidebar collapses: a **bottom dock** holds the
  four destinations and a hamburger (top bar) slides the sidebar in as a drawer.

## Quick review checklist

- **Guest nav** — every destination is reachable without signing in.
- **Responsive** — resize the window (or use the browser's device toolbar):
  desktop shows the left sidebar; phone width shows the bottom dock + hamburger
  drawer, and the drawer closes after you pick a destination.
- **Keyboard** — press `Tab` from the top: the skip link appears, every control
  shows a visible focus ring, `Esc` closes the drawer.
- **Status, not colour alone** — the Guest pill and the active nav item stay
  readable in grayscale (icon + text + orange accent bar).

> Note: the browser's responsive mode is for layout review only — do a quick
> check on a real phone before the handoff (TRI-5 PDF §5).

## Troubleshooting

- **Blank page / "Failed to load module script"** — you opened the file
  directly (`file://`). Use one of the server options above so it's served over
  `http://`.
- **Port already in use** — change the port, e.g.
  `python3 -m http.server 8080 --directory frontend`.

See [`frontend/README.md`](../frontend/README.md) for the file structure and
implementation notes.
