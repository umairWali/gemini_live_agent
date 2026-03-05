#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# ==============================================================================
# Automated Deployment Script for Google Cloud Run
# Project: Personal AI Operator (Gemini Live Agent Challenge)
# ==============================================================================

# Configurations
SERVICE_NAME="personal-ai-operator"
REGION="us-central1"
ENTRY_POINT="."

echo " Starting automated deployment to Google Cloud Run..."
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"

# 1. Check if gcloud is installed
if ! command -v gcloud &> /dev/null
then
    echo " Error: Google Cloud CLI (gcloud) is not installed."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# 2. Check API Key
if [ -z "$API_KEY" ]; then
    echo " Warning: The API_KEY environment variable is not set."
    echo "Please set it before running this script, for example:"
    echo "export API_KEY='your_gemini_api_key'"
    echo "However, attempting deployment. Ensure the API_KEY is set in Cloud Run console if this fails."
fi

# 3. Deploy to Cloud Run
echo " Building container and deploying to Google Cloud Run..."
echo "This might take a few minutes..."

ENV_VARS_FLAG=""
if [ -n "$API_KEY" ]; then
    ENV_VARS_FLAG="--set-env-vars=API_KEY=${API_KEY}"
fi

gcloud run deploy "$SERVICE_NAME" \
  --source "$ENTRY_POINT" \
  --region "$REGION" \
  --allow-unauthenticated \
  $ENV_VARS_FLAG

echo " Deployment completed successfully!"
echo " Your Personal Operator is now live."
