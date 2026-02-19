#!/bin/sh
# Generate runtime env.js config for frontend app.

set -eu

# Prefer new runtime key, keep legacy fallback for compatibility.
export API_BASE_URL="${API_BASE_URL:-${VITE_API_BASE_URL:-}}"
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-}"

envsubst < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js
rm -f /usr/share/nginx/html/env.template.js
