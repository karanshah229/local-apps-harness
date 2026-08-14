# Skill: Nginx Routing & Configuration

This guide helps configure and manage Nginx reverse proxy routes and services.

## Validation and Controls

### Test Nginx Configuration Syntax
Run inside the nginx container or on the host:
```bash
nginx -t
```

### Reload Configuration Without Restarting
```bash
nginx -s reload
```

## Common Configuration Blocks

### Reverse Proxy (with WebSockets)
```nginx
location /api/ {
    proxy_pass http://backend-service:5000/;
    proxy_http_version 1.1;

    # Headers to support WebSocket upgrade
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";

    # Standard proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Redirect Path to Preserve Trailing Slashes
```nginx
location = /my-app {
    return 301 $scheme://$http_host$request_uri/;
}
```
This is critical so that relative browser assets (like `js/index.js`) resolve correctly to `/my-app/js/index.js` rather than `/js/index.js`.
