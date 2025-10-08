# ED-API
Backend API

## Features
- Game API
- Translation API & Language Files

## Scripts Included
- Update GameDig List: "node ./scripts/updateGamesYml.js",

## Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Configure your `.env` file.
3. Start the server:
   ```sh
   node index.js
   ```

## Endpoints 
- `/public` - Public directory
- `/gameapi` - Game API info

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
        proxy_pass http://147.135.215.179:2002/;
    }
}
```