import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'words.db');

const db = new Database(dbPath);

// Создание таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS nouns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS verbs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS accusative (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    letters_per_word INTEGER DEFAULT 3,
    num_digits INTEGER DEFAULT 3,
    num_special INTEGER DEFAULT 2
  );
`);

// Инициализация настроек по умолчанию
const existingSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
if (!existingSettings) {
    db.prepare('INSERT INTO settings (id, letters_per_word, num_digits, num_special) VALUES (1, 3, 3, 2)').run();
}

export default db;
