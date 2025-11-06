# Тестирование TelegramThread

## Обзор

Проект использует комплексный подход к тестированию с разделением на unit и интеграционные тесты.

## Структура

```
test/
├── unit/                      # Unit тесты (изолированные компоненты)
│   ├── AbstractThread.test.mjs
│   ├── Callbacks.test.mjs
│   ├── Message.test.mjs
│   ├── MessageError.test.mjs
│   └── utils/
│       └── index.test.mjs
├── integration/               # Интеграционные тесты (взаимодействие компонентов)
│   ├── Chat.test.mjs
│   └── TelegramThreadBot.test.mjs
├── fixtures/                  # Тестовые данные и моки
│   └── mockData.mjs
└── setup.mjs                  # Глобальная настройка тестов
```

## Запуск тестов

### Все тесты
```bash
npm test
```

### Только unit тесты
```bash
npm run test:unit
```

### Только интеграционные тесты
```bash
npm run test:integration
```

### С покрытием кода
```bash
npm run test:coverage
```

### В режиме watch (автоматический перезапуск при изменениях)
```bash
npm run test:watch
```

## Покрытие тестами

### Message (8 тестов)
- ✅ Создание экземпляра
- ✅ Доступ к ID и тексту
- ✅ Определение типа сообщения (текст, фото)
- ✅ Определение и извлечение команд
- ✅ Получение текста без команд
- ✅ Доступ к чату
- ✅ Определение отправителя (бот/пользователь)

### MessageError (7 тестов)
- ✅ Создание с различными параметрами
- ✅ Сохранение clientMessage
- ✅ Сохранение вложенной ошибки
- ✅ Обработка параметра from
- ✅ Сохранение дополнительной информации
- ✅ Stack trace

### AbstractThread (6 тестов)
- ✅ Создание экземпляра
- ✅ Валидация обязательных параметров
- ✅ Запуск processing функции
- ✅ Автоматическая остановка после завершения
- ✅ Ручная остановка потока
- ✅ Эмиссия событий

### Callbacks (7 тестов)
- ✅ Создание и сохранение callback
- ✅ Генерация уникальных ID
- ✅ Выполнение callback
- ✅ Автоматическое удаление после выполнения
- ✅ Обработка ошибок
- ✅ Проверка существования
- ✅ Глобальный singleton

### Utils (5 тестов)
- ✅ Создание inline-клавиатур
- ✅ Разделение кнопок на строки
- ✅ Обработка пустых массивов
- ✅ Значения по умолчанию
- ✅ Обработка неполных строк

### Chat (3 теста)
- ✅ Создание и кеширование чатов
- ✅ Отправка текстовых сообщений
- ✅ Typing action

### TelegramThreadBot (12 тестов)
- ✅ Инициализация с токеном
- ✅ Использование переменных окружения
- ✅ Валидация токена
- ✅ Глобальный экземпляр
- ✅ Пользовательские классы Message/Chat
- ✅ Запуск polling
- ✅ Обработка сообщений
- ✅ Обработка callback запросов

## Технологии

- **Mocha** - тестовый фреймворк
- **Chai** - assertion библиотека
- **Sinon** - моки и стабы для изоляции зависимостей
- **c8** - инструмент для измерения покрытия кода

## Особенности

### Моки Telegram API
Все тесты используют моки вместо реального Telegram API:
- Не требуется реальный токен бота
- Быстрое выполнение тестов
- Изоляция от внешних сервисов
- Предсказуемое поведение

### ESM модули
Тесты написаны с использованием ES модулей (.mjs):
- Современный синтаксис import/export
- Асинхронная загрузка модулей
- Совместимость с основным кодом

### Async/Await
Все асинхронные операции тестируются корректно:
- Правильная обработка промисов
- Тестирование ошибок
- Таймауты для длительных операций

## Добавление новых тестов

### Unit тест
Создайте файл в `test/unit/`:
```javascript
import { expect, sinon } from '../setup.mjs';
import YourClass from '../../src/YourClass.mjs';

describe('YourClass Unit Tests', () => {
    it('должен делать что-то', () => {
        const instance = new YourClass();
        expect(instance).to.be.instanceOf(YourClass);
    });
});
```

### Интеграционный тест
Создайте файл в `test/integration/`:
```javascript
import { expect, sinon } from '../setup.mjs';
import TelegramThreadBot from '../../src/TelegramThreadBot.mjs';

describe('Feature Integration Tests', () => {
    let bot;

    beforeEach(() => {
        bot = new TelegramThreadBot({ token: 'test-token' });
        bot.instance = {
            sendMessage: sinon.stub().resolves({ message_id: 123 })
        };
    });

    it('должен интегрироваться правильно', async () => {
        // ваш тест
    });
});
```

## Отладка тестов

### Запуск одного теста
```bash
npx mocha test/unit/Message.test.mjs
```

### С дебаггером
```bash
node --inspect-brk node_modules/.bin/mocha test/unit/Message.test.mjs
```

### Подробный вывод
Mocha уже настроен на подробный вывод. Если нужно еще больше информации:
```bash
DEBUG=* npm test
```

## CI/CD

Для использования в CI/CD добавьте в ваш workflow:
```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

## Результаты

**Общее количество тестов: 48**
- ✅ Unit тесты: 35
- ✅ Интеграционные тесты: 13
- ✅ Все тесты проходят успешно
