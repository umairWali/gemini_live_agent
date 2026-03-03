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
COPY --from=build-frontend /app/dist ./dist
COPY sidecar/ ./sidecar/

# Expose port (Cloud Run uses PORT env var, default 8080 or what we specify)
EXPOSE 3000

# Start script with virtual display for screenshots
# Note: In Cloud Run, $PORT is usually 8080. Our app uses 3000.
# We will set the PORT env var in Cloud Run or adjust our app.
WORKDIR /app/sidecar
CMD ["sh", "-c", "Xvfb :99 -screen 0 1280x1024x24 & export DISPLAY=:99 && npm start"]
