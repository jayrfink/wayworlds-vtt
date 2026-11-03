#!/bin/bash

# Ensure openspec CLI is installed
if ! command -v openspec &> /dev/null; then
  echo "Installing openspec CLI..."
  npm install -g @fission-ai/openspec
fi

agy --conversation=56fff995-ef1c-41a2-ac76-fa27c1572dff
