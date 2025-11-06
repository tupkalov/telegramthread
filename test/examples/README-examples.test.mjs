import { expect, sinon } from '../setup.mjs';
import TelegramThreadBot from '../../src/TelegramThreadBot.mjs';
import Message from '../../src/Message.mjs';
import Chat from '../../src/Chat.mjs';
import AbstractThread from '../../src/AbstractThread.mjs';
import { mockData } from '../fixtures/mockData.mjs';

describe('README Examples Tests', () => {
    let bot;
    let mockTelegramInstance;

    beforeEach(() => {
        mockTelegramInstance = {
            on: sinon.stub(),
            sendMessage: sinon.stub().resolves({
                message_id: 123,
                chat: mockData.message.chat,
                from: { id: 999, is_bot: true },
                text: 'Response text'
            }),
            sendPhoto: sinon.stub().resolves({
                message_id: 456,
                chat: mockData.message.chat,
                from: { id: 999, is_bot: true },
                photo: [{ file_id: 'test-file-id' }]
            }),
            sendChatAction: sinon.stub().resolves(true),
            editMessageText: sinon.stub().resolves({
                message_id: 123,
                chat: mockData.message.chat,
                text: 'Edited text'
            }),
            answerCallbackQuery: sinon.stub().resolves(true)
        };

        bot = new TelegramThreadBot({ token: 'test-token' });
        bot.instance = mockTelegramInstance;

        Chat.chats = {};
    });

    afterEach(() => {
        Object.values(Chat.chats || {}).forEach(chat => {
            if (chat.stopTyping) {
                chat.stopTyping();
            }
            if (chat.thread) {
                chat.thread.stop();
            }
        });

        sinon.restore();
        delete global._telegramthread_bot;
        Chat.chats = {};
    });

    describe('Пример 1: Простой бот', () => {
        it('должен отвечать на команду /start', async () => {
            const message = new Message({
                ...mockData.message,
                text: '/start'
            });

            expect(message.is('/start')).to.be.true;
            await message.chat.sendText('Привет! Я бот на базе telegramthread.');
            
            expect(mockTelegramInstance.sendMessage.calledOnce).to.be.true;
        });
    });

    describe('Пример 2: Обработка команд', () => {
        it('должен обрабатывать команду /help', async () => {
            const message = new Message({
                ...mockData.message,
                text: '/help'
            });

            if (message.is('/help')) {
                await message.chat.sendText('Доступные команды:\n/start - начать\n/help - справка');
            }
            
            expect(mockTelegramInstance.sendMessage.calledOnce).to.be.true;
        });

        it('должен обрабатывать неизвестную команду', async () => {
            const message = new Message({
                ...mockData.message,
                text: '/unknown'
            });

            if (!message.is('/start') && !message.is('/help')) {
                await message.chat.sendText('Неизвестная команда');
            }
            
            expect(mockTelegramInstance.sendMessage.calledOnce).to.be.true;
        });
    });

    describe('Пример 3: Работа с фотографиями', () => {
        it('должен обрабатывать фото сообщение', async () => {
            const photoMessage = new Message({
                ...mockData.message,
                photo: [
                    { file_id: 'small', width: 100, height: 100 },
                    { file_id: 'large', width: 800, height: 600 }
                ]
            });

            expect(photoMessage.isPhoto()).to.be.greaterThan(0);
            
            const fileId = photoMessage.getLastPhoto().file_id;
            expect(fileId).to.equal('large');

            await photoMessage.chat.sendText('Получил фото!');
            await photoMessage.chat.sendPhoto(fileId, { caption: 'Вот твоё фото' });
            
            expect(mockTelegramInstance.sendMessage.calledOnce).to.be.true;
            expect(mockTelegramInstance.sendPhoto.calledOnce).to.be.true;
        });
    });

    describe('Пример 4: Простой диалог (Thread)', () => {
        it('должен вести многошаговый диалог', async () => {
            const message = new Message({
                ...mockData.message,
                text: '/ask'
            });

            if (message.is('/ask')) {
                const processingFunc = async (msg, nextMessage) => {
                    await message.chat.sendText('Как тебя зовут?');
                    
                    // Симулируем получение ответа
                    const nameMsg = { text: 'Иван' };
                    
                    await message.chat.sendText('Сколько тебе лет?');
                    
                    // Симулируем получение ответа
                    const ageMsg = { text: '25' };
                    
                    await message.chat.sendText(`Привет, ${nameMsg.text}! Тебе ${ageMsg.text} лет.`);
                };

                // Запускаем поток и ждем его завершения
                await message.chat.startThread(processingFunc, message);
                
                expect(message.chat.thread).to.not.exist; // Поток должен завершиться
            }
        });
    });

    describe('Пример 5: Inline клавиатура', () => {
        it('должен создавать inline клавиатуру', async () => {
            const message = new Message({
                ...mockData.message,
                text: '/menu'
            });

            await message.chat.sendText('Выберите действие:', {
                inlineKeyboard: [[
                    { text: '✅ Да', action: async () => 'Вы выбрали: Да' },
                    { text: '❌ Нет', action: async () => 'Вы выбрали: Нет' }
                ]]
            });
            
            const sendOptions = mockTelegramInstance.sendMessage.firstCall.args[2];
            expect(sendOptions.reply_markup).to.exist;
            expect(sendOptions.reply_markup.inline_keyboard).to.be.an('array');
        });
    });

    describe('Пример: AbstractThread класс', () => {
        it('должен работать с кастомным AbstractThread', () => {
            class TestThread extends AbstractThread {
                async processing(msg, nextMessage) {
                    await this.chat.sendText('Тестовое сообщение');
                }
            }

            const message = new Message(mockData.message);
            const thread = new TestThread(message.chat, { processing: TestThread.prototype.processing });
            
            expect(thread).to.be.instanceOf(AbstractThread);
            expect(thread.chat).to.equal(message.chat);
        });
    });

    describe('Пример: Редактирование сообщений', () => {
        it('должен редактировать сообщение (прогресс бар)', async () => {
            const message = new Message({
                ...mockData.message,
                text: '/progress'
            });

            // Отправляем начальное сообщение
            const msg = await message.chat.sendText('⏳ Загрузка: 0%');
            
            expect(msg).to.be.instanceOf(Message);
            
            // Симулируем редактирование
            await message.chat.editTextMessage(msg.id, '⏳ Загрузка: 100%');
            
            expect(mockTelegramInstance.editMessageText.calledOnce).to.be.true;
        });
    });

    describe('Пример: Обработка ошибок в callback', () => {
        it('должен обрабатывать callback_query', (done) => {
            bot.on('callback_query', ({ key, waitUntil }) => {
                waitUntil((async () => {
                    if (key === 'test-action') {
                        done();
                        return 'Действие выполнено';
                    }
                })());
            });

            bot.emit('callback_query', {
                key: 'test-action',
                message: new Message(mockData.message),
                waitUntil: async (promise) => {
                    await promise;
                }
            });
        });
    });

    describe('Пример: Проверка команд', () => {
        it('должен извлекать команды из сообщения', () => {
            const commandMessage = new Message({
                ...mockData.message,
                text: '/start @botname',
                entities: [{ type: 'bot_command', offset: 0, length: 6 }]
            });

            expect(commandMessage.isCommand()).to.be.true;
            
            const commands = commandMessage.getCommands();
            expect(commands).to.have.lengthOf(1);
            expect(commands[0]).to.equal('/start');
        });

        it('должен получать текст без команды', () => {
            const commandMessage = new Message({
                ...mockData.message,
                text: '/search query text',
                entities: [{ type: 'bot_command', offset: 0, length: 7 }]
            });

            const textWithoutCommand = commandMessage.getTextWithoutCommands();
            expect(textWithoutCommand).to.equal('query text');
        });
    });

    describe('Пример: Reply сообщения', () => {
        it('должен обрабатывать reply_to_message', () => {
            const replyMessage = new Message({
                ...mockData.message,
                message_id: 999,
                reply_to_message: {
                    message_id: 123,
                    chat: mockData.message.chat,
                    from: mockData.message.from,
                    text: 'Original message'
                }
            });

            expect(replyMessage.isReply()).to.be.true;
            expect(replyMessage.getReplyId()).to.equal(123);
            
            const originalMessage = replyMessage.getReply();
            expect(originalMessage).to.be.instanceOf(Message);
            expect(originalMessage.text).to.equal('Original message');
        });
    });

    describe('Пример: sendText с split', () => {
        it('должен разбивать длинное сообщение', async () => {
            const message = new Message(mockData.message);
            const longText = 'A'.repeat(5000); // Текст больше 4096 символов

            await message.chat.sendText(longText, { split: true });
            
            // Должно быть вызвано более одного раза
            expect(mockTelegramInstance.sendMessage.callCount).to.be.greaterThan(1);
        });
    });

    describe('Пример: Typing action', () => {
        it('должен отправлять typing action', async () => {
            const message = new Message(mockData.message);
            
            message.chat.startTyping();
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockTelegramInstance.sendChatAction.called).to.be.true;
            expect(mockTelegramInstance.sendChatAction.firstCall.args[1]).to.equal('typing');
            
            message.chat.stopTyping();
        });

        it('должен поддерживать разные типы action', async () => {
            const message = new Message(mockData.message);
            
            message.chat.startTyping('upload_photo');
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockTelegramInstance.sendChatAction.firstCall.args[1]).to.equal('upload_photo');
            
            message.chat.stopTyping();
        });
    });

    describe('Пример: Получение bot и Chat', () => {
        it('должен иметь доступ к боту из сообщения', () => {
            const message = new Message(mockData.message);
            
            expect(message.bot).to.equal(bot);
        });

        it('должен иметь доступ к чату из сообщения', () => {
            const message = new Message(mockData.message);
            
            expect(message.chat).to.be.instanceOf(Chat);
            expect(message.Chat).to.equal(Chat);
        });
    });

    describe('Пример: Геттеры Message', () => {
        it('должен предоставлять доступ к данным', () => {
            const message = new Message(mockData.message);
            
            expect(message.id).to.equal(mockData.message.message_id);
            expect(message.text).to.equal(mockData.message.text);
            expect(message.from).to.deep.equal(mockData.message.from);
            expect(message.date).to.equal(mockData.message.date);
        });
    });

    describe('Пример: JSON сериализация', () => {
        it('должен сериализовать Message в JSON', () => {
            const message = new Message(mockData.message);
            const json = message.toJSON();
            
            expect(json).to.deep.equal(mockData.message);
        });

        it('должен сериализовать Chat в JSON', () => {
            const message = new Message(mockData.message);
            const chat = message.chat;
            const json = chat.toJSON();
            
            expect(json).to.deep.equal(mockData.message.chat);
        });
    });
});
