import express from 'express';
import cors from 'cors';
import db from './database.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Админ credentials (в продакшене использовать переменные окружения!)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SecuPass2024!';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Простая проверка авторизации
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = credentials.split(':');

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Неверный логин или пароль' });
    }
};

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

// API для генерации пароля
app.get('/api/generate', (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        
        const noun = db.prepare('SELECT word FROM nouns ORDER BY RANDOM() LIMIT 1').get();
        const verb = db.prepare('SELECT word FROM verbs ORDER BY RANDOM() LIMIT 1').get();
        const acc = db.prepare('SELECT word FROM accusative ORDER BY RANDOM() LIMIT 1').get();

        if (!noun || !verb || !acc) {
            return res.status(500).json({ error: 'Недостаточно слов в базе данных' });
        }

        const ruWords = [noun.word, verb.word, acc.word];
        const enWords = ruWords.map(w => transliterate(w));

        // Генерация чисел
        const numDigits = settings?.num_digits || 3;
        const minNum = Math.pow(10, numDigits - 1);
        const maxNum = Math.pow(10, numDigits) - 1;
        const numbers = Math.floor(minNum + Math.random() * (maxNum - minNum + 1)).toString();

        // Аббревиатура из слов
        const lettersPerWord = settings?.letters_per_word || 3;
        const abbr = enWords.map(word =>
            word.charAt(0).toUpperCase() + word.slice(1, lettersPerWord).toLowerCase()
        ).join('');

        // Спецсимволы
        const specialChars = ['!', '@', '#', '$', '%', '&', '*', '?', '+', '='];
        const numSpecial = settings?.num_special || 2;
        let specials = '';
        for (let i = 0; i < numSpecial; i++) {
            specials += specialChars[Math.floor(Math.random() * specialChars.length)];
        }

        // Формирование пароля
        const specialStart = specials.slice(0, Math.ceil(numSpecial / 2));
        const specialEnd = specials.slice(Math.ceil(numSpecial / 2));
        const password = specialStart + numbers + abbr + specialEnd;

        res.json({
            password,
            phrase: ruWords.join(' '),
            transcription: enWords.join(' '),
            settings: {
                lettersPerWord,
                numDigits,
                numSpecial
            }
        });
    } catch (error) {
        console.error('Ошибка генерации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Проверка авторизации
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Неверный логин или пароль' });
    }
});

// Получение настроек
app.get('/api/admin/settings', authMiddleware, (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
        res.json(settings || {
            letters_per_word: 3,
            num_digits: 3,
            num_special: 2
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения настроек' });
    }
});

// Сохранение настроек
app.post('/api/admin/settings', authMiddleware, (req, res) => {
    try {
        const { letters_per_word, num_digits, num_special } = req.body;
        
        db.prepare(`
            INSERT OR REPLACE INTO settings (id, letters_per_word, num_digits, num_special)
            VALUES (1, ?, ?, ?)
        `).run(letters_per_word, num_digits, num_special);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения настроек' });
    }
});

// Получение статистики словарей
app.get('/api/admin/dictionaries', authMiddleware, (req, res) => {
    try {
        const nouns = db.prepare('SELECT COUNT(*) as count FROM nouns').get();
        const verbs = db.prepare('SELECT COUNT(*) as count FROM verbs').get();
        const accusative = db.prepare('SELECT COUNT(*) as count FROM accusative').get();
        
        res.json({
            nouns: nouns.count,
            verbs: verbs.count,
            accusative: accusative.count
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// Получение слов из словаря
app.get('/api/admin/dictionary/:type', authMiddleware, (req, res) => {
    const { type } = req.params;
    const validTypes = ['nouns', 'verbs', 'accusative'];
    
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Неверный тип словаря' });
    }
    
    try {
        const words = db.prepare(`SELECT word FROM ${type} ORDER BY word`).all();
        res.json(words.map(w => w.word));
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения словаря' });
    }
});

// Загрузка словаря (добавление слов)
app.post('/api/admin/dictionary/:type', authMiddleware, (req, res) => {
    const { type } = req.params;
    const { words } = req.body;
    const validTypes = ['nouns', 'verbs', 'accusative'];
    
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Неверный тип словаря' });
    }
    
    if (!Array.isArray(words)) {
        return res.status(400).json({ error: 'Ожидается массив слов' });
    }
    
    try {
        const insert = db.prepare(`INSERT OR IGNORE INTO ${type} (word) VALUES (?)`);
        const insertMany = db.transaction((words) => {
            let added = 0;
            for (const word of words) {
                if (typeof word === 'string' && word.trim()) {
                    const result = insert.run(word.trim());
                    if (result.changes > 0) added++;
                }
            }
            return added;
        });
        
        const added = insertMany(words);
        const total = db.prepare(`SELECT COUNT(*) as count FROM ${type}`).get();
        
        res.json({ 
            success: true, 
            added,
            total: total.count 
        });
    } catch (error) {
        console.error('Ошибка загрузки словаря:', error);
        res.status(500).json({ error: 'Ошибка загрузки словаря' });
    }
});

// Очистка словаря
app.delete('/api/admin/dictionary/:type', authMiddleware, (req, res) => {
    const { type } = req.params;
    const validTypes = ['nouns', 'verbs', 'accusative'];
    
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Неверный тип словаря' });
    }
    
    try {
        db.prepare(`DELETE FROM ${type}`).run();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка очистки словаря' });
    }
});

// Эндпоинт для проверки здоровья
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend запущен на http://localhost:${PORT}`);
});
