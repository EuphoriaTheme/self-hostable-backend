# ED-API

Backend API

## Features

- Game API
- Translation API & Language Files
- Fastify-based HTTP server
- Optional auto-fetch from blueprint-translations on startup

## Scripts Included

- Update GameDig List: "node ./scripts/updateGamesYml.js",
- Sync blueprint translations now: "npm run sync:translations"

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Configure your `.env` file.
   - You can copy from `.env.example` and adjust values.
3. Start the server:
   ```sh
    npm start
   ```

## Environment Variables

- `PORT` (default: `3000`)
- `TRANSLATIONS_AUTO_FETCH` (default: `true`)
- `TRANSLATIONS_SOURCE_BASE_URL` (default: `https://raw.githubusercontent.com/EuphoriaTheme/blueprint-translations/main`)
- `TRANSLATIONS_REMOTE_PATHS` (default: `translations,public/translations`)
- `TRANSLATIONS_TIMEOUT_MS` (default: `10000`)
- `TRANSLATIONS_GITHUB_TREE_LOOKUP` (default: `true`)
- `TRANSLATIONS_FILE_LIST` (optional, comma-separated `.json` files)

## Endpoints

- `/public` - Public directory
- `/gameapi` - Game API info
- `/translations` - Translation endpoints
- `/rcon` - RCON endpoints

## Pterodactyl Egg (Not Yet Tested)

- Import: `deploy/pterodactyl/egg-self-hostable-backend-api.json`
- The egg installs production dependencies and starts with `npm start`.
- Environment variables for translation auto-fetch are included in egg variables.

## Example NGINX Reverse Proxy

```
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}
server {
    listen 80;
    server_name testing.euphoriadevelopment.uk;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name testing.euphoriadevelopment.uk;
    ssl_certificate /etc/letsencrypt/live/testing.euphoriadevelopment.uk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/testing.euphoriadevelopment.uk/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    # Handle preflight requests
    location / {
        if ($request_method = OPTIONS) {
            add_header 'Access-Control-Allow-Origin' "$http_origin" always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
            add_header 'Access-Control-Max-Age' 86400;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        add_header 'Access-Control-Allow-Origin' "$http_origin" always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_pass http://localhost:2000/;
    }
}

```
