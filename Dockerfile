# Build Stage for Frontend
FROM node:20 AS build-frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Final Stage
FROM node:20
WORKDIR /app

# Install System Dependencies (For Screenshots and GUI tools)
RUN apt-get update && apt-get install -y \
    imagemagick \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependencies and install
COPY sidecar/package*.json ./sidecar/
WORKDIR /app/sidecar
RUN npm install

# Copy everything else
WORKDIR /app
COPY sidecar/ ./sidecar/
# Ensure fresh frontend build is served (overwrite legacy dashboard)
COPY --from=build-frontend /app/dist/ ./sidecar/dashboard/

# Start script with virtual display for screenshots
# Note: Google Cloud provides $PORT. Our app listens on it correctly.
EXPOSE 3000
WORKDIR /app/sidecar
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 & export DISPLAY=:99 && npm start"]
