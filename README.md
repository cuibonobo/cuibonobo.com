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

Available post types: `article`, `ephemera`, `page`

```bash
# Create a new post and start editing it
npm run cli -- new <postType>

# Commit the currently-edited post to the datastore
npm run cli -- commit

# List existing posts
npm run cli -- list <postType>

# Edit an existing post
npm run cli -- edit <postID>

# Discard the current edit
npm run cli -- discard

# Check if there are posts being edited
npm run cli -- status

# Generate a slug for the given text
npm run cli -- slugify <quotedText>
```

## Building on Cloudflare Pages

### Build Configuration

- Build command: `npm run build`
- Build output directory: `build`

### Environment Variables

- `NODE_VERSION`: `14`
- `TZ`: `America/New_York`
