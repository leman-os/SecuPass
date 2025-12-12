import { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [password, setPassword] = useState('');
    const [phrase, setPhrase] = useState('');
    const [transcription, setTranscription] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            // Пробуем современный API
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(password);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                // Fallback для HTTP
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

                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}

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
                        Формат: 3 цифры + 9 букв + спецсимвол
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;