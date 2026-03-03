#!/bin/bash
cd /root/personal-ai-operator/sidecar
export NODE_ENV=production
/usr/bin/node /root/personal-ai-operator/sidecar/node_modules/.bin/tsx server.ts
