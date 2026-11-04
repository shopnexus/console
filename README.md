# ShopNexus console

The staff console for ShopNexus. Staff use it to manage accounts, staff members and the audit log through `/v1/staff/*` on the Go server. It is a React single-page app built with Vite and served as static files by nginx.

## Development

```
bun install
cp .env.example .env
bun run dev
```

The dev server runs on `http://localhost:5173`, the one origin the server's `.env.example` allows through CORS. `VITE_API_URL` points at the Go server.

In a deployed stack the console is at `console.<domain>` and finds the API at `api.<domain>` from its own host, so one image runs in both stacks. Sign-in sets the `staff_session` cookie, and every request sends it with `credentials: 'include'`.

`bun run lint` runs oxlint and `bun run build` type-checks and writes `dist/`.

## Design

`DESIGN.md` lists what the console takes from the Android app's design system and what it changes for a desk tool. The tokens are in `src/styles/tokens.css`, the same file as the website's.

## Image

The Dockerfile builds with Bun and serves `dist/` from nginx on port 80, falling back to `index.html` for client routes. A push to `main` builds `ghcr.io/shopnexus/console:main`, and a `v*` tag builds a semver tag.
