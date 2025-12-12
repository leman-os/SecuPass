import { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [password, setPassword] = useState('');
    const [phrase, setPhrase] = useState('');
    const [transcription, setTranscription] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAdmin, setShowAdmin] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authToken, setAuthToken] = useState('');

    const generatePassword = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/generate');
            if (!response.ok) throw new Error('Ошибка сервера');

            const data = await response.json();
            setPassword(data.password);
            setPhrase(data.phrase);
            setTranscription(data.transcription);
        } catch (err) {
            setError('Не удалось сгенерировать пароль');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        generatePassword();
    }, []);

    const copyToClipboard = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(password);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = password;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                try {
                    document.execCommand('copy');
                    textArea.remove();
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                } catch (err) {
                    textArea.remove();
                    alert('Не удалось скопировать');
                }
            }
        } catch (err) {
            console.error('Ошибка копирования:', err);
        }
    };

    const highlightAbbreviation = (text) => {
        if (!text) return null;
        const words = text.split(' ');
        return words.map((word, i) => (
            <span key={i}>
                <strong className="highlight">{word.slice(0, 3).toUpperCase()}</strong>
                <span className="normal">{word.slice(3)}</span>
                {i < words.length - 1 && ' '}
            </span>
        ));
    };

    const handleLogin = async (username, password) => {
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (response.ok) {
                const data = await response.json();
                setAuthToken(data.token);
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setAuthToken('');
        setShowAdmin(false);
    };

    if (showAdmin) {
        return (
            <AdminPanel
                isAuthenticated={isAuthenticated}
                authToken={authToken}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onClose={() => setShowAdmin(false)}
            />
        );
    }

    return (
        <div className="app">
            <div className="container">
                <div className="header">
                    <div className="icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>
                    <h1>Генератор паролей</h1>
                    <p className="subtitle">Безопасные и запоминающиеся пароли</p>
                </div>

                {error && <div className="error">{error}</div>}

                <div className="password-box">
                    <p className="label">ВАШ ПАРОЛЬ</p>
                    <p className={`password ${loading ? 'loading' : ''}`}>
                        {password || 'Загрузка...'}
                    </p>
                </div>

                <div className="buttons">
                    <button
                        onClick={copyToClipboard}
                        disabled={loading || !password}
                        className={`btn btn-copy ${copied ? 'copied' : ''}`}
                    >
                        {copied ? '✓ Скопировано!' : '📋 Скопировать'}
                    </button>

                    <button
                        onClick={generatePassword}
                        disabled={loading}
                        className="btn btn-refresh"
                    >
                        {loading ? '⏳ Генерация...' : '🔄 Обновить'}
                    </button>
                </div>

                <div className="info-box">
                    <div className="info-section">
                        <p className="info-label">ФРАЗА</p>
                        <p className="info-text">{phrase || '—'}</p>
                        <p className="info-hint">
                            Структура: Существительное + Глагол + Существительное (вин. падеж)
                        </p>
                    </div>

                    <div className="divider"></div>

                    <div className="info-section">
                        <p className="info-label purple">ТРАНСКРИПЦИЯ</p>
                        <p className="info-text">
                            {highlightAbbreviation(transcription) || '—'}
                        </p>
                    </div>
                </div>

                <div className="footer">
                    <div className="badge">
                        <span className="pulse"></span>
                        Безопасный пароль
                    </div>
                </div>

                <button 
                    className="admin-btn"
                    onClick={() => setShowAdmin(true)}
                >
                    ⚙️ Администрирование
                </button>
            </div>
        </div>
    );
}

function AdminPanel({ isAuthenticated, authToken, onLogin, onLogout, onClose }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const [settings, setSettings] = useState({
        letters_per_word: 3,
        num_digits: 3,
        num_special: 2
    });
    
    const [dictStats, setDictStats] = useState({
        nouns: 0,
        verbs: 0,
        accusative: 0
    });
    
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('settings');

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authToken}`
    };

    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        }
    }, [isAuthenticated]);

    const loadData = async () => {
        try {
            const [settingsRes, dictRes] = await Promise.all([
                fetch('/api/admin/settings', { headers: authHeaders }),
                fetch('/api/admin/dictionaries', { headers: authHeaders })
            ]);
            
            if (settingsRes.ok) {
                const data = await settingsRes.json();
                setSettings(data);
            }
            
            if (dictRes.ok) {
                const data = await dictRes.json();
                setDictStats(data);
            }
        } catch (err) {
            console.error('Ошибка загрузки данных:', err);
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoading(true);
        
        const success = await onLogin(username, password);
        
        if (!success) {
            setLoginError('Неверный логин или пароль');
        }
        setLoading(false);
    };

    const saveSettings = async () => {
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(settings)
            });
            
            if (response.ok) {
                setMessage('✅ Настройки сохранены');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('❌ Ошибка сохранения');
        }
    };

    const handleFileUpload = async (type, file) => {
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            
            let words = [];
            if (Array.isArray(json)) {
                words = json;
            } else if (json.words && Array.isArray(json.words)) {
                words = json.words;
            } else {
                setMessage('❌ Неверный формат файла');
                return;
            }
            
            const response = await fetch(`/api/admin/dictionary/${type}`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ words })
            });
            
            if (response.ok) {
                const data = await response.json();
                setMessage(`✅ Добавлено ${data.added} слов. Всего: ${data.total}`);
                loadData();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('❌ Ошибка чтения файла. Проверьте формат JSON.');
        }
    };

    const clearDictionary = async (type) => {
        const names = {
            nouns: 'существительных',
            verbs: 'глаголов',
            accusative: 'винительного падежа'
        };
        
        if (!confirm(`Вы уверены, что хотите очистить словарь ${names[type]}?`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/admin/dictionary/${type}`, {
                method: 'DELETE',
                headers: authHeaders
            });
            
            if (response.ok) {
                setMessage('✅ Словарь очищен');
                loadData();
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (err) {
            setMessage('❌ Ошибка очистки');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="app">
                <div className="container admin-container">
                    <div className="header">
                        <div className="icon admin-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                            </svg>
                        </div>
                        <h1>Администрирование</h1>
                        <p className="subtitle">Вход в панель управления</p>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="login-form">
                        {loginError && <div className="error">{loginError}</div>}
                        
                        <div className="form-group">
                            <label>Логин</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Введите логин"
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Пароль</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Введите пароль"
                                required
                            />
                        </div>
                        
                        <div className="buttons">
                            <button type="submit" className="btn btn-refresh" disabled={loading}>
                                {loading ? '⏳ Вход...' : '🔐 Войти'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                ← Назад
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <div className="container admin-container">
                <div className="header">
                    <div className="icon admin-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    </div>
                    <h1>Панель управления</h1>
                </div>

                {message && (
                    <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
                        {message}
                    </div>
                )}

                <div className="tabs">
                    <button 
                        className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        ⚙️ Настройки
                    </button>
                    <button 
                        className={`tab ${activeTab === 'dictionaries' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dictionaries')}
                    >
                        📚 Словари
                    </button>
                </div>

                {activeTab === 'settings' && (
                    <div className="admin-section">
                        <h2>Настройки сложности пароля</h2>
                        
                        <div className="settings-grid">
                            <div className="setting-item">
                                <label>Букв из каждого слова</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={settings.letters_per_word}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        letters_per_word: parseInt(e.target.value) || 1
                                    })}
                                />
                                <span className="hint">Сколько букв брать из каждого слова (1-10)</span>
                            </div>
                            
                            <div className="setting-item">
                                <label>Количество цифр</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={settings.num_digits}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        num_digits: parseInt(e.target.value) || 0
                                    })}
                                />
                                <span className="hint">Количество цифр в пароле (0-10)</span>
                            </div>
                            
                            <div className="setting-item">
                                <label>Спецсимволов</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={settings.num_special}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        num_special: parseInt(e.target.value) || 0
                                    })}
                                />
                                <span className="hint">Количество спецсимволов (0-10)</span>
                            </div>
                        </div>
                        
                        <div className="preview-box">
                            <p className="preview-label">Формат пароля:</p>
                            <p className="preview-text">
                                {settings.num_special > 0 ? `[${Math.ceil(settings.num_special/2)} спецсимв.]` : ''}
                                {settings.num_digits > 0 ? `[${settings.num_digits} цифр]` : ''}
                                [{settings.letters_per_word * 3} букв]
                                {settings.num_special > 0 ? `[${Math.floor(settings.num_special/2)} спецсимв.]` : ''}
                            </p>
                            <p className="preview-hint">
                                Примерная длина: {
                                    Math.ceil(settings.num_special/2) + 
                                    settings.num_digits + 
                                    (settings.letters_per_word * 3) + 
                                    Math.floor(settings.num_special/2)
                                } символов
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'dictionaries' && (
                    <div className="admin-section">
                        <h2>Управление словарями</h2>
                        
                        <div className="dict-grid">
                            <DictionaryCard
                                title="Существительные"
                                type="nouns"
                                count={dictStats.nouns}
                                onUpload={handleFileUpload}
                                onClear={clearDictionary}
                            />
                            
                            <DictionaryCard
                                title="Глаголы"
                                type="verbs"
                                count={dictStats.verbs}
                                onUpload={handleFileUpload}
                                onClear={clearDictionary}
                            />
                            
                            <DictionaryCard
                                title="Винительный падеж"
                                type="accusative"
                                count={dictStats.accusative}
                                onUpload={handleFileUpload}
                                onClear={clearDictionary}
                            />
                        </div>
                        
                        <div className="format-hint">
                            <h3>📄 Формат JSON файла:</h3>
                            <pre>{`["слово1", "слово2", "слово3"]`}</pre>
                            <p>или</p>
                            <pre>{`{"words": ["слово1", "слово2", "слово3"]}`}</pre>
                        </div>
                    </div>
                )}

                <div className="admin-buttons">
                    <button className="btn btn-copy" onClick={saveSettings}>
                        💾 Сохранить
                    </button>
                    <button className="btn btn-secondary" onClick={() => { onLogout(); onClose(); }}>
                        🚪 Выход
                    </button>
                </div>
            </div>
        </div>
    );
}

function DictionaryCard({ title, type, count, onUpload, onClear }) {
    const fileInputRef = useState(null);
    
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onUpload(type, file);
            e.target.value = '';
        }
    };
    
    return (
        <div className="dict-card">
            <h3>{title}</h3>
            <p className="dict-count">{count} слов</p>
            
            <div className="dict-actions">
                <label className="upload-btn">
                    📤 Загрузить
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </label>
                
                <button 
                    className="clear-btn"
                    onClick={() => onClear(type)}
                >
                    🗑️ Очистить
                </button>
            </div>
        </div>
    );
}

export default App;
