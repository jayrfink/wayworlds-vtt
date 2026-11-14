#!/bin/bash

# Ensure openspec CLI is installed
if ! command -v openspec &> /dev/null; then
  echo "Installing openspec CLI..."
  npm install -g @fission-ai/openspec
fi

agy -c
