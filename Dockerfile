# Используем легкий образ nginx
FROM nginx:alpine

# Копируем наш HTML файл в директорию nginx
COPY index.html /usr/share/nginx/html/

# Открываем порт 80
EXPOSE 80

# Запускаем nginx (команда по умолчанию)
CMD ["nginx", "-g", "daemon off;"]
