#!/bin/sh
# Generates runtime env.js config for frontend app.

set -eu

export API_BASE_URL="${API_BASE_URL}"

envsubst < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js
rm -f /usr/share/nginx/html/env.template.js
