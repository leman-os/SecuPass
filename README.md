# SecuPass
Сервис генерации запоминающихся паролей. (Rus Password generation service)

Данный простой сервис предназначен для генерации надежных, но в то же время запоминающихся паролей. 
Принцип построения пароля - 3 случайных числа, комбинация из первых трех букв трех слов, с заглавной буквы и спецсимвол. Запомнив три слова на русском языке не составит труда запомнить весь пароль.

<img width="1388" height="816" alt="image" src="https://github.com/user-attachments/assets/41fcc6d3-5375-4013-abe0-d5702f250d3f" />

(This simple service is designed to generate reliable, but at the same time memorable passwords. 
The principle of building a password is 3 random numbers, a combination of the first three letters of three words, with a capital letter and a special character. Memorizing three words in Russian will not be difficult to remember the entire password.)

Система позволяет администрировать сложность пароля и словари слов

<img width="639" height="664" alt="image" src="https://github.com/user-attachments/assets/ead53ab0-3d83-43b5-85df-283b139039bd" />

<img width="640" height="825" alt="image" src="https://github.com/user-attachments/assets/56388c2d-2b08-4a20-b748-5aeb5046afd0" />


Инструкция по запуску контейнера (Docker container start instruction)

Первоначальный пароль администратора для входа в админпанель настраивается в Dockerfile
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=НовыйПароль123! 
```

# 1. Соберите образ (build image)
```
docker build -t password-generator:latest .
```
# 2. Запустите контейнер (start container)
```
docker run -d -p 8080:80 --name password-gen password-generator:latest
```
# 3. Откройте в браузере (open in browser)
```
http://localhost:8080
```
# 4. Запуск контейнера с кастомными данными для входа
```
docker run -d -p 8080:80 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=НовыйПароль123! \
  --name passgen password-generator
```
