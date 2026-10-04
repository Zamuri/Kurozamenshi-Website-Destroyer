# Kurozamenshi Website Destroyer

Repository name/display title:
**Kurozamenshi Website Destroyer**

Recommended GitHub branch:
**main**

## Folder layout

```text
/
├── index.html
├── manifest.webmanifest
├── sw.js
├── _app/
└── assets/
    ├── cc0/
    ├── featured/
    ├── fonts/
    ├── maps/
    │   └── fonts/
    ├── sfx/
    ├── site/
    ├── sprites/
    └── video/
```

This package is the cleaned client/asset base collected for the personal offline project.

### Current state

- Local game client and static assets are included.
- GitHub Pages project-path URLs in `index.html` have been changed from `/...` to relative `./...`.
- `sw.js` precaches the local HTML/JS/assets so the same project can be reopened without Internet after the first successful load.
- Server-dependent endpoints from the original site (for example `/api/...` and `/mp/...`) are not implemented by this package yet.
- The next development step is the personal offline wrapper: Add HTML, saved local HTML/levels, and removal of dependence on the original page-generation API.
- This package does not alter purchase/entitlement checks for third-party paid content.

## GitHub Pages

Upload the **contents of this folder** to the `main` branch. Enable GitHub Pages from the repository's Pages settings, using the `main` branch as the source.

For a project repository, relative asset URLs are used intentionally so the site works below the repository path.

## Important

Do not rename `_app` or `assets`, and keep their internal paths intact.
