# TelegramThread

Библиотека для создания Telegram ботов с поддержкой thread-based диалогов. Позволяет создавать многошаговые диалоги с пользователями, сохраняя состояние между сообщениями.

## Основные возможности

- 🧵 **Thread-based диалоги** - создание многошаговых разговоров с пользователями
- 💾 **Сохранение состояния** - автоматическое сохранение и восстановление состояния тредов
- 🔄 **Middleware поддержка** - добавление промежуточных обработчиков
- ⌨️ **Inline и Reply клавиатуры** - удобная работа с кнопками
- 📝 **Редактирование сообщений** - обновление отправленных сообщений
- ⚡ **Асинхронная обработка** - полная поддержка async/await
- 🎯 **Callback queries** - обработка нажатий на inline кнопки

## Установка

```bash
npm install telegramthread
```

## Быстрый старт

### 1. Создание простого бота

```javascript
const { Bot } = require('telegramthread');

const bot = new Bot();
bot.start();

bot.onMessage(async (message, chat) => {
    if (message.is('/start')) {
        await chat.sendText('Привет! Я бот на базе telegramthread.');
    }
});
```

### 2. Обработка команд

```javascript
bot.onMessage(async (message, chat) => {
    if (message.is('/start')) {
        await chat.sendText('Привет! Используй /help для справки');
    }
    else if (message.is('/help')) {
        await chat.sendText('Доступные команды:\n/start - начать\n/help - справка');
    }
    else {
        await chat.sendText('Неизвестная команда');
    }
});
```

### 3. Работа с фотографиями

```javascript
bot.onMessage(async (message, chat) => {
    if (message.isPhoto()) {
        const fileId = message.getLastPhoto().file_id;
        await chat.sendText('Получил фото!');
        await chat.sendPhoto(fileId, { caption: 'Вот твоё фото' });
    }
});
```

### 4. Простой диалог (Thread)

```javascript
bot.onMessage(async (message, chat) => {
    if (message.is('/ask')) {
        await chat.startThread(async (chat, getNextMessage) => {
            await chat.sendText('Как тебя зовут?');
            const nameMsg = await getNextMessage();
            
            await chat.sendText('Сколько тебе лет?');
            const ageMsg = await getNextMessage();
            
            await chat.sendText(`Привет, ${nameMsg.text}! Тебе ${ageMsg.text} лет.`);
        });
    }
});
```

### 5. Inline клавиатура

```javascript
bot.onMessage(async (message, chat) => {
    if (message.is('/menu')) {
        await chat.sendText('Выберите действие:', {
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Да', callback_data: 'yes' },
                    { text: '❌ Нет', callback_data: 'no' }
                ]]
            }
        });
    }
});

bot.on('callback_query', async ({ key, waitUntil }) => {
    waitUntil((async () => {
        if (key === 'yes') return '✅ Вы выбрали: Да';
        if (key === 'no') return '❌ Вы выбрали: Нет';
    })());
});
```

## Основные приемы работы

### Использование AbstractThread класса

Для сложных диалогов рекомендуется использовать класс `AbstractThread`:

```javascript
const { AbstractThread } = require('telegramthread');

class SearchThread extends AbstractThread {
    constructor(chat, message, storage) {
        super(chat, message);
        this.storage = storage;
    }

    async processing(getNextMessage) {
        // Отправляем приветственное сообщение
        await this.chat.sendText('🔍 Введите поисковый запрос:');
        
        // Ждем следующее сообщение
        const queryMessage = await getNextMessage();
        
        // Выполняем поиск
        const results = await this.storage.search(queryMessage.text);
        
        if (results.length === 0) {
            await this.chat.sendText('❌ Ничего не найдено');
            return;
        }
        
        // Показываем результаты
        await this.chat.sendText(`✅ Найдено: ${results.length} результатов`);
        
        // Показываем первые 5 результатов с кнопками
        const keyboard = results.slice(0, 5).map((item, index) => [{
            text: `${index + 1}. ${item.name}`,
            callback_data: `item_${item.id}`
        }]);

        await this.chat.sendText('📋 Выберите результат:', {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    }
}

// Регистрация треда
bot.onMessage(async (message, chat) => {
    if (message.is('/search')) {
        const thread = new SearchThread(chat, message, storage);
        await chat.startThread(thread);
    }
});

// Обработка нажатий на кнопки
bot.on('callback_query', async ({ key, waitUntil, message }) => {
    if (key.startsWith('item_')) {
        waitUntil((async () => {
            const itemId = key.slice(5);
            const item = await storage.getById(itemId);
            
            if (item) {
                await message.chat.sendText(`� ${item.name}\n\n${item.description}`);
            } else {
                return "❌ Элемент не найден";
            }
        })());
    }
});
```

### Многошаговый диалог с проверкой

```javascript
const { AbstractThread } = require('telegramthread');

class RegistrationThread extends AbstractThread {
    async processing(getNextMessage) {
        // Шаг 1: Запрашиваем имя
        await this.chat.sendText('Как вас зовут?');
        const nameMsg = await getNextMessage();
        const name = nameMsg.text;
        
        // Шаг 2: Запрашиваем возраст
        await this.chat.sendText('Сколько вам лет?');
        const ageMsg = await getNextMessage();
        const age = parseInt(ageMsg.text);
        
        // Проверка возраста
        if (isNaN(age) || age < 18) {
            await this.chat.sendText('❌ Возраст должен быть числом и не менее 18');
            return;
        }
        
        // Шаг 3: Запрашиваем email
        await this.chat.sendText('Введите ваш email:');
        const emailMsg = await getNextMessage();
        const email = emailMsg.text;
        
        // Проверка email
        if (!email.includes('@')) {
            await this.chat.sendText('❌ Неверный формат email');
            return;
        }
        
        // Сохраняем данные
        await storage.saveUser({ name, age, email, chatId: this.chat.id });
        
        // Подтверждение
        await this.chat.sendText(
            `✅ Регистрация завершена!\n\n` +
            `Имя: ${name}\n` +
            `Возраст: ${age}\n` +
            `Email: ${email}`
        );
    }
}

bot.onMessage(async (message, chat) => {
    if (message.is('/register')) {
        await chat.startThread(RegistrationThread);
    }
});
```

### Редактирование сообщений

```javascript
bot.onMessage(async (message, chat) => {
    if (message.is('/progress')) {
        await chat.startThread(async (chat, getNextMessage) => {
            // Отправляем сообщение, которое будем редактировать
            const msg = await chat.sendText('⏳ Загрузка: 0%');
            
            // Имитируем загрузку с обновлением прогресса
            for (let i = 1; i <= 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await msg.edit(`⏳ Загрузка: ${i * 20}%`);
            }
            
            await msg.edit('✅ Загрузка завершена!');
        });
    }
});
```

### Обработка фото с диалогом

```javascript
bot.onMessage(async (message, chat) => {
    if (message.isPhoto() && !chat.thread) {
        await chat.startThread(async (chat, message, getNextMessage) => {
            const photo = message.getLastPhoto();
            
            // Запрашиваем описание
            await chat.sendText('📝 Введите описание для фото:');
            const descMsg = await getNextMessage();
            
            // Сохраняем фото с описанием
            await storage.savePhoto({
                fileId: photo.file_id,
                description: descMsg.text,
                chatId: chat.id
            });
            
            // Отправляем подтверждение
            await chat.sendPhoto(photo.file_id, {
                caption: `✅ Сохранено:\n${descMsg.text}`
            });
        });
    }
});
```

### Использование Middleware

```javascript
// Middleware для логирования
bot.use(async (message, chat, next) => {
    console.log(`[${new Date().toISOString()}] ${chat.id}: ${message.text}`);
    await next();
});

// Middleware для проверки прав доступа
bot.use(async (message, chat, next) => {
    const allowedUsers = [123456789, 987654321];
    
    if (!allowedUsers.includes(message.from.id)) {
        await chat.sendText('⛔ Доступ запрещен');
        return;
    }
    
    await next();
});

// Middleware для обработки ошибок
bot.use(async (message, chat, next) => {
    try {
        await next();
    } catch (error) {
        console.error('Error:', error);
        await chat.sendText('❌ Произошла ошибка');
    }
});
```

### Работа с хранилищем состояния

```javascript
const { Bot } = require('telegramthread');

// Создаем свой класс хранилища
class RedisStorage {
    constructor(redisClient) {
        this.redis = redisClient;
    }

    async get(chatId) {
        const data = await this.redis.get(`chat:${chatId}`);
        return data ? JSON.parse(data) : null;
    }

    async set(chatId, data) {
        await this.redis.set(`chat:${chatId}`, JSON.stringify(data));
    }

    async delete(chatId) {
        await this.redis.del(`chat:${chatId}`);
    }
}

const storage = new RedisStorage(redisClient);
const bot = new Bot({ storage });

// Теперь состояние тредов будет сохраняться в Redis
```

## API Reference

### Bot

```javascript
const { Bot } = require('telegramthread');
const bot = new Bot(options);
```

**Options:**
- `token` - Telegram Bot API токен (по умолчанию из `process.env.TELEGRAM_BOT_TOKEN`)
- `storage` - Объект хранилища для сохранения состояния тредов
- `MessageClass` - Кастомный класс для сообщений (наследуется от `Message`)

**Методы:**
- `bot.start()` - Запуск бота
- `bot.onMessage(handler)` - Обработчик входящих сообщений
- `bot.use(middleware)` - Добавление middleware
- `bot.on('callback_query', handler)` - Обработчик нажатий на inline кнопки

### AbstractThread

```javascript
const { AbstractThread } = require('telegramthread');

class MyThread extends AbstractThread {
    async processing(getNextMessage) {
        // Ваша логика диалога
    }
}
```

**Свойства:**
- `this.chat` - Объект чата
- `this.message` - Последнее сообщение пользователя
- `this.bot` - Объект бота

**Методы:**
- `processing(getNextMessage)` - Основной метод с логикой диалога
- `getNextMessage(options)` - Ждет следующее сообщение от пользователя
  - `options.image` - Ждать фото
  - `options.text` - Ждать текст
- `stop()` - Остановка треда

### Chat

**Методы:**
- `chat.sendText(text, options)` - Отправка текстового сообщения
  - `options.reply_markup` - Клавиатура (inline или reply)
  - `options.split` - Разбить длинное сообщение на несколько
- `chat.sendPhoto(photo, options)` - Отправка фото
  - `photo` - file_id или URL
  - `options.caption` - Подпись к фото
- `chat.sendDocument(document, options)` - Отправка документа
- `chat.sendAction(action)` - Отправка action ('typing', 'upload_photo' и т.д.)
- `chat.sendMediaGroup(media)` - Отправка группы медиа
- `chat.startThread(Thread, ...args)` - Запуск треда
  - Можно передать класс или функцию

### Message

**Проверки:**
- `message.is(text)` - Проверка текста сообщения
- `message.isCommand()` - Проверка, является ли сообщение командой
- `message.isPhoto()` - Проверка, является ли сообщение фото
- `message.isText()` - Проверка, является ли сообщение текстом
- `message.isReply()` - Проверка, является ли сообщение ответом

**Получение данных:**
- `message.text` - Текст сообщения
- `message.from.id` - ID отправителя
- `message.chat.id` - ID чата
- `message.getLastPhoto()` - Получение последнего фото
- `message.getTextWithoutCommands()` - Текст без команд

**Действия:**
- `message.edit(text, options)` - Редактирование сообщения

### Callback Query

```javascript
bot.on('callback_query', async ({ key, waitUntil, message }) => {
    waitUntil((async () => {
        // Обработка нажатия
        // key - значение callback_data
        // message - объект сообщения с кнопками
        
        // Вернуть строку - показать уведомление пользователю
        return 'Готово!';
    })());
});
```

## Примеры использования в проектах

### Простой AI бот (BairisBot)

```javascript
const { Bot } = require('telegramthread');

const bot = new Bot();
bot.start();

// Middleware для проверки доступа
bot.use(async (message, chat, next) => {
    const allowedUsers = [123456789];
    if (!allowedUsers.includes(message.from.id)) {
        return chat.sendText('⛔ Доступ запрещен');
    }
    await next();
});

// Обработка текстовых сообщений
bot.onMessage(async (message, chat) => {
    if (message.isText()) {
        // Показываем, что бот печатает
        await chat.sendAction('typing');
        
        // Получаем ответ от AI
        const response = await ai.chat(message.text);
        
        // Отправляем ответ
        await chat.sendText(response);
    }
});
```

### Поисковый бот (Inventor)

```javascript
const { Bot, AbstractThread } = require('telegramthread');

const bot = new Bot();
bot.start();

// Поиск по запросу или фото
bot.onMessage(async (message, chat) => {
    if (message.is('/search')) {
        await chat.startThread(SearchThread);
    }
    else if (message.isPhoto() && !chat.thread) {
        // Создаем новый объект из фото
        await chat.startThread(EditItemThread);
    }
});

// Обработка выбора результата поиска
bot.on('callback_query', async ({ key, waitUntil, message }) => {
    if (key.startsWith('si_')) {
        waitUntil((async () => {
            const itemId = key.slice(3);
            const item = await storage.getById(itemId);
            
            if (item) {
                await message.chat.sendPhoto(item.photo, {
                    caption: item.description
                });
            }
        })());
    }
});
```

## Лицензия

MIT