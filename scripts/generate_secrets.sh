#!/bin/bash
# Generate strong production secrets for ConsentVault Core

echo "🔐 Generating ConsentVault secrets..."
echo ""
echo "# Security"
echo "SECRET_KEY=$(openssl rand -hex 32)"
echo "JWT_SECRET_KEY=$(openssl rand -hex 32)"
echo ""
echo "✅ Copy these values to your .env file"


