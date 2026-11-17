# TripleThr3at
Web based hockey training assistant using computer vision and performance tracking.

## Project layout
- `frontend/` — Web app (HTML5 + CSS + vanilla JS). App shell and navigation. See [frontend/README.md](frontend/README.md).
- `TT3database/` — MySQL schema, seed data, and query/test scripts. See [TT3database/README.md](TT3database/README.md).

## Running the frontend
See [docs/running-the-frontend.md](docs/running-the-frontend.md). Quick start:
```bash
python3 -m http.server 8000 --directory frontend
```
Then open <http://localhost:8000>.

## Documentation
- [User guide](docs/user-guide.md) — setup, terms, building a workout, training, progress, settings, and limits.
- [Demo script](docs/demo-script.md) — full end-to-end demonstration walkthrough.
- Feature notes: [live feedback](docs/live-feedback.md) · [hands-free controls](docs/hands-free-controls.md) · [settings & profile](docs/settings-and-profile.md) · [progress & recommendations](docs/progress-and-recommendations.md) · [tracking validation](docs/tracking-validation.md).

