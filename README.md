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

## Integrated BSG COMMS

The complete radio application lives in `comms/` and is opened from the homepage at `./comms/`. It is copied from `ImoTechAI/squawk` at source commit `66db0d0babf8e51ea2f5d92cf6364d202b2e48af`. The original repository remains unchanged. Visible branding is BSG COMMS; legacy `squawk-*` localStorage keys, backup format identifiers and DOM events are deliberately preserved for compatibility with existing browser data and test contracts. **Browser storage is origin-specific:** data saved on the former GitHub Pages origin is not automatically accessible on the BSG domain. Export JSON from the old app and restore it in BSG COMMS when moving profiles/channels.

Run the full radio regression suite from `comms/` using `npm run check && npm test`. The Range Planner and all hardware transport safeguards remain unchanged. Read/Write buttons stay disabled. The radio UI uses Leaflet CDN assets for map rendering, so some map functionality needs network access despite the app's offline-first design.

## BSG Central Dashboard

The public homepage remains at `/`. Its **Launch Dashboard** link opens the dedicated static app launcher at `/dashboard/` (or `/bsg1/dashboard/` on GitHub Pages). The central dashboard links to the existing BSG COMMS app at `/comms/`. BSG COMMS provides a return link to the central dashboard. BSG OSINT is displayed as **Coming Soon** only; no AfricanMan application has been imported or deployed. Gear and Training currently link back to their existing public homepage sections. No backend, login, deployment or DNS change is included.

## BSG OSINT

The BSG Central Dashboard launches `/osint/`, a static copy of the **public AfricanMan app** from source commit `6b3479f723d19cfeea405b67738fd47f6c2539b3`. This includes the globe, country explorer, news wall, radio player and African Revolution Timeline (ART). The original AfricanMan repository and its Firebase authentication/backend, account pages, deployment configuration, and DNS are **not** copied or modified. This is not an independent live intelligence backend: map tiles, streaming news, radio, remote datasets and third-party embeds may require internet connectivity or external services. Browser testing is required to verify external integrations and cross-origin limitations. BSG OSINT's main globe page includes a link back to `/dashboard/`.
