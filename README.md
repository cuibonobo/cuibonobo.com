# cuibonobo.com

I want an SSG that routes to real HTML pages and doesn't load JavaScript unless it's necessary. Is that so much to ask?

## Running locally

```bash
npm install
npm run build
npm run dev
```

## Development

```bash
# Run type-checking and formatting
npm run check

# Fix lint errors
npm run lint:fix

# Run tests
npm run test
```

## CLI

This tool allows interaction with the stack without having to manually update files and databases or generate IDs. By default the CLI will interact with the local Cloudflare development environment, but it's possible to interact with the production Cloudflare instance by adding an `--omit=dev` flag.

Available resource types: `article`, `note`, `page`

```bash
# Create a new resource and start editing it
npm run cli -- new <resourceType>

# Commit the currently-edited resource to the datastore
npm run cli -- commit

# List existing resources
npm run cli -- list <resourceType>

# Read an existing resource
npm run cli -- read <resourceID>

# Edit an existing resource
npm run cli -- edit <resourceID>

# Discard the current edit
npm run cli -- discard

# Check if there are resources being edited
npm run cli -- status

# Generate a slug for the given text
npm run cli -- slugify <quotedText>
```

## Building on Cloudflare Pages

### Build Configuration

- Build command: `npm run build`
- Build output directory: `build`

### Environment Variables

- `NODE_ENV`: `production`
- `NODE_VERSION`: `18`
- `TZ`: `America/New_York`
- `API_TOKEN`: `<secret>`
