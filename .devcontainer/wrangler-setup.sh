#!/usr/bin/env bash
set -euo pipefail

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  cat <<EOF
CLOUDFLARE_API_TOKEN is not set inside the container.
Create a Cloudflare API token (recommended: limited-scope token for Workers/D1) and set it on your host as:

  export CLOUDFLARE_API_TOKEN=your_token_here

Then rebuild/reopen the devcontainer so the value is injected into the container.
EOF
  exit 1
fi

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler CLI not found in container. Install globally with: npm i -g wrangler"
  exit 2
fi

echo "Using CLOUDFLARE_API_TOKEN inside container to verify authentication..."
env CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" wrangler whoami || {
  echo "wrangler failed to authenticate. If this token lacks permissions, create a new API token in Cloudflare dashboard with appropriate scopes." 
  exit 3
}

echo "wrangler appears authenticated. You can now run wrangler commands without the interactive OAuth flow."
