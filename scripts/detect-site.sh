#!/bin/bash
# Detect which site to build based on Netlify site name or URL

if [[ "$SITE_NAME" == *"marketing"* ]] || [[ "$URL" == "https://sentientiq.ai" ]]; then
  echo "Building marketing site..."
  cd marketing-website && npm install && npm run build
else
  echo "Building main app..."
  npm install && npm run build
fi