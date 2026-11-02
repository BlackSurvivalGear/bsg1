# Black Survival Gear — Website

Preparedness-led website for **Black Survival Gear (BSG)**. Static, dependency-free HTML/CSS/JavaScript suitable for GitHub Pages previews and later Firebase Hosting.

## Local preview

Run `python3 -m http.server 8000` in the repository and open `http://localhost:8000`.

## Checks

Run `node --check script.js` and `python3 -m unittest discover -s tests -v` (Python 3 required).

## Publishing

1. Preview on GitHub Pages after review and merge. The repository must have Pages enabled manually if not already configured.
2. Keep the current Google Site and DNS unchanged during preview.
3. Configure Firebase Hosting in a separate reviewed change; verify a Firebase preview before any custom-domain cutover.

## Scope notes

The BSG COMMS button currently links to the existing radio app URL until its rebrand and hosting migration are completed. Equipment and contact links intentionally direct visitors to the current BSG site; no commerce, contact form, authentication or payment backend is implemented. No DNS or production deployment is performed by this PR.
