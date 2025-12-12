import db from './database.js';

// Начальные данные (20 слов каждого типа)
const nouns = [
    'Стрекоза', 'Тигр', 'Месяц', 'Облако', 'Птица',
    'Звезда', 'Лиса', 'Море', 'Гора', 'Небо',
    'Солнце', 'Река', 'Луна', 'Зима', 'Зверь',
    'Медведь', 'Мост', 'Лес', 'Жаба', 'Муха'
];

const verbs = [
    'щекочет', 'веселит', 'кричит', 'поёт', 'прыгает',
    'гуляет', 'глядит', 'пишет', 'видит', 'думает',
    'держит', 'знает', 'играет', 'ищет', 'касается',
    'летит', 'мечтает', 'несёт', 'плавает', 'растёт'
];

const accusative = [
    'волну', 'тигра', 'месяц', 'облако', 'птицу',
    'звезду', 'лису', 'море', 'гору', 'небо',
    'солнце', 'реку', 'луну', 'зиму', 'зверя',
    'медведя', 'мост', 'лес', 'жабу', 'муху'
];

// Проверяем, пусты ли таблицы
const nounsCount = db.prepare('SELECT COUNT(*) as count FROM nouns').get();
const verbsCount = db.prepare('SELECT COUNT(*) as count FROM verbs').get();
const accCount = db.prepare('SELECT COUNT(*) as count FROM accusative').get();

if (nounsCount.count === 0 && verbsCount.count === 0 && accCount.count === 0) {
    const insertNoun = db.prepare('INSERT INTO nouns (word) VALUES (?)');
    const insertVerb = db.prepare('INSERT INTO verbs (word) VALUES (?)');
    const insertAccusative = db.prepare('INSERT INTO accusative (word) VALUES (?)');

    nouns.forEach(word => insertNoun.run(word));
    verbs.forEach(word => insertVerb.run(word));
    accusative.forEach(word => insertAccusative.run(word));

    console.log('✅ База данных инициализирована начальными данными!');
} else {
    console.log('ℹ️ База данных уже содержит данные, пропускаем инициализацию');
}

console.log(`📊 Существительные: ${db.prepare('SELECT COUNT(*) as count FROM nouns').get().count}`);
console.log(`📊 Глаголы: ${db.prepare('SELECT COUNT(*) as count FROM verbs').get().count}`);
console.log(`📊 Винительный падеж: ${db.prepare('SELECT COUNT(*) as count FROM accusative').get().count}`);

db.close();
