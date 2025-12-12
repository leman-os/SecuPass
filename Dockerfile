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

# Копирование конфигов
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

# Переменные окружения для админки (можно переопределить при запуске)
ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=SecuPass2024!

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
