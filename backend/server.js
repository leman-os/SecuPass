import express from 'express';
import cors from 'cors';
import db from './database.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API для генерации пароля (НЕ возвращает все слова!)
app.get('/api/generate', (req, res) => {
    try {
        // Получаем по одному случайному слову из каждой таблицы
        const noun = db.prepare('SELECT word FROM nouns ORDER BY RANDOM() LIMIT 1').get();
        const verb = db.prepare('SELECT word FROM verbs ORDER BY RANDOM() LIMIT 1').get();
        const acc = db.prepare('SELECT word FROM accusative ORDER BY RANDOM() LIMIT 1').get();

        if (!noun || !verb || !acc) {
            return res.status(500).json({ error: 'Недостаточно слов в базе данных' });
        }

        // Транслитерация
        const transliterate = (text) => {
            const map = {
                'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
                'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
                'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
                'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
                'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
                'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
                'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
                'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
                'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
                'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
            };
            return text.split('').map(char => map[char] || char).join('');
        };

        const ruWords = [noun.word, verb.word, acc.word];
        const enWords = ruWords.map(w => transliterate(w));

        // Генерация пароля
        const numbers = Math.floor(100 + Math.random() * 900).toString();
        const abbr = enWords.map(word =>
            word.charAt(0).toUpperCase() + word.slice(1, 3).toLowerCase()
        ).join('');
        const specialChars = ['!', '@', '#', '$', '%', '&', '*', '?', '+', '='];
        const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
        const specialCharF = specialChars[Math.floor(Math.random() * specialChars.length)];

        const password = specialCharF + numbers + abbr + specialChar;

        res.json({
            password,
            phrase: ruWords.join(' '),
            transcription: enWords.join(' ')
        });
    } catch (error) {
        console.error('Ошибка генерации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Эндпоинт для проверки здоровья
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend запущен на http://localhost:${PORT}`);
});