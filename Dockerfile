# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-build

# Установка зависимостей для компиляции better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN node init-db.js

# Stage 3: Final image
FROM node:20-alpine

# Установка nginx и supervisor
RUN apk add --no-cache nginx supervisor

# Создание директорий
RUN mkdir -p /run/nginx /var/log/supervisor

# Копирование frontend
COPY --from=frontend-build /frontend/dist /usr/share/nginx/html

# Копирование backend (включая node_modules и скомпилированный sqlite)
COPY --from=backend-build /backend /app

# Nginx конфигурация
RUN cat > /etc/nginx/http.d/default.conf << 'EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Supervisor конфигурация
RUN cat > /etc/supervisord.conf << 'EOF'
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:backend]
command=node /app/server.js
directory=/app
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g 'daemon off;'
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
EOF

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]