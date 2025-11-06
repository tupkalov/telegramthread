# TelegramThread - Telegram Bot Library

## Описание проекта
Библиотека для создания Telegram ботов с поддержкой потоков (threads) и управления диалогами.

### Основные компоненты:
- **TelegramThreadBot** - главный класс бота
- **Chat** - управление чатом
- **Message** - работа с сообщениями
- **AbstractThread** - абстракция для создания потоков диалога
- **Callbacks** - управление inline-кнопками и колбэками
- **MessageError** - обработка ошибок
- **Utils** - вспомогательные функции

## Тестирование

### Структура
```
test/
├── unit/           # Unit тесты компонентов
├── integration/    # Интеграционные тесты
├── examples/       # Тесты на основе README
├── fixtures/       # Тестовые данные (mockData.mjs)
└── setup.mjs       # Глобальная настройка (chai, sinon)
```

### Команды
```bash
npm test              # Все тесты
npm run test:coverage # С покрытием кода
npm run test:unit     # Только unit
npm run test:watch    # Watch режим
```

### Важно при написании тестов
- Используй моки Telegram API (не требуется реальный токен)
- В `afterEach` очищай: `Chat.chats`, `global._telegramthread_bot`, typing интервалы, threads
- Для async operations используй `await`
- В `.mocharc.json` установлен `"exit": true` для принудительного выхода

### Результаты
- **126 тестов**, покрытие **~89%**
- Модули с 100%: Callbacks, MessageError, utils
- Тесты выполняются ~300-500ms

## Инструкции для агентов
- Дополняй AGENTS.md только необходимой информацией для работы агента
- Отвечай на языке вопроса