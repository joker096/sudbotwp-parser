FROM node:20-bullseye

# Install Chrome for Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    apt-transport-https \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for Vite build
COPY package.json package-lock.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./
COPY src ./src
COPY public ./public

# Install all dependencies (including Vite build tools)
RUN npm install

# Build Vite app
RUN npm run build

# Copy render server package and install its dependencies
COPY render-package.json ./render-package.json
RUN npm install --omit=dev

# Keep only the server dependencies that are needed
# Remove node_modules and reinstall from render-package.json
RUN rm -rf node_modules && mv render-package.json package.json && npm install

COPY render-server.js ./

# Copy favicon and root assets (needed for Vite build output)
COPY favicon.ico ./
COPY favicon-16x16.png ./
COPY favicon-32x32.png ./
COPY apple-touch-icon.png ./
COPY site.webmanifest ./

EXPOSE 3000

CMD ["node", "render-server.js"]
