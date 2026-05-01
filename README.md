# Salus Invoicing — Frontend

Vite + React + TypeScript client for the Salus Invoicing FastAPI backend at
`https://salus-invoicing.onrender.com`.

## Local development

```bash
npm install
npm run dev
```

The app talks to the production backend by default. Override with a `.env.local`:

```
VITE_API_BASE_URL=http://localhost:8000
```

## Build

```bash
npm run build
```

Outputs a static site to `dist/`.

## Deploy

Static site on Render. Build command: `npm install && npm run build`. Publish
directory: `dist`. Set `VITE_API_BASE_URL` if the backend is on a different host.
