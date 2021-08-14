# cuibonobo.com

I want an SSG that routes to real HTML pages and doesn't load JavaScript unless it's necessary. Is that so much to ask?

## Running locally
```bash
npm run install
npm run dev
```

## Building on Cloudflare Pages
### Build Configuration
- Build command: `npm run build`
- Build output directory: `build`

### Environment Variables
- `NODE_VERSION`: `14`
- `TZ`: `America/New_York`
