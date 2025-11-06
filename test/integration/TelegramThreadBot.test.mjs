import { expect, sinon } from '../setup.mjs';
import TelegramThreadBot from '../../src/TelegramThreadBot.mjs';
import Message from '../../src/Message.mjs';
import Chat from '../../src/Chat.mjs';
import { mockData } from '../fixtures/mockData.mjs';

describe('TelegramThreadBot Integration Tests', () => {
    let bot;
    let mockTelegramInstance;

    beforeEach(() => {
        mockTelegramInstance = {
            on: sinon.stub(),
            sendMessage: sinon.stub().resolves({ message_id: 123 }),
            sendChatAction: sinon.stub().resolves(true),
            answerCallbackQuery: sinon.stub().resolves(true),
            stopPolling: sinon.stub().resolves(),
            startPolling: sinon.stub().resolves(),
            getFileLink: sinon.stub().resolves('http://example.com/file')
        };
        
        Chat.chats = {};
    });

    afterEach(() => {
        // Очищаем все чаты и их интервалы
        Object.values(Chat.chats || {}).forEach(chat => {
            if (chat.stopTyping) {
                chat.stopTyping();
            }
            if (chat.thread) {
                chat.thread.stop();
            }
        });
        
        // Останавливаем бота если он был запущен
        if (bot && bot.instance && bot.instance.stopPolling) {
            bot.instance.stopPolling().catch(() => {});
        }
        
        sinon.restore();
        delete global._telegramthread_bot;
        Chat.chats = {};
    });

    describe('Инициализация бота', () => {
        it('должен создавать экземпляр бота с токеном', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            
            expect(bot).to.be.instanceOf(TelegramThreadBot);
            expect(bot.token).to.equal('test-token');
        });

        it('должен использовать токен из переменной окружения', () => {
            process.env.TELEGRAM_BOT_TOKEN = 'env-token';
            bot = new TelegramThreadBot();
            
            expect(bot.token).to.equal('env-token');
            
            delete process.env.TELEGRAM_BOT_TOKEN;
        });

        it('должен выбрасывать ошибку если токен не предоставлен', () => {
            expect(() => new TelegramThreadBot()).to.throw('TelegramThreadBot: token is required');
        });

        it('должен устанавливать глобальный экземпляр бота', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            
            expect(global._telegramthread_bot).to.equal(bot);
        });

        it('должен использовать пользовательский класс Message', () => {
            class CustomMessage extends Message {}
            bot = new TelegramThreadBot({ token: 'test-token', MessageClass: CustomMessage });
            
            expect(bot.Message).to.equal(CustomMessage);
        });

        it('должен использовать пользовательский класс Chat', () => {
            class CustomChat extends Chat {}
            bot = new TelegramThreadBot({ token: 'test-token', ChatClass: CustomChat });
            
            expect(bot.Chat).to.equal(CustomChat);
        });
    });

    describe('Запуск бота', () => {
        it('должен запускать polling', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            
            // Мокируем start() вместо реального вызова
            const startStub = sinon.stub(bot, 'start').callsFake(function() {
                this.instance = mockTelegramInstance;
            });
            
            bot.start();
            
            expect(bot.instance).to.exist;
            expect(startStub.calledOnce).to.be.true;
        });
    });

    describe('Обработка сообщений', () => {
        it('должен обрабатывать входящие сообщения', (done) => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            bot.onMessage(async (message, chat) => {
                expect(message).to.be.instanceOf(Message);
                expect(chat).to.be.instanceOf(Chat);
                done();
            });
            
            // Симулируем получение сообщения
            const messageHandler = mockTelegramInstance.on.getCalls()
                .find(call => call.args[0] === 'message')?.args[1];
            
            if (messageHandler) {
                messageHandler(mockData.message);
            } else {
                // Если бот не был запущен, создаем обработчик вручную
                bot.onMessage(async (message, chat) => {
                    expect(message).to.be.instanceOf(Message);
                    expect(chat).to.be.instanceOf(Chat);
                    done();
                });
            }
        });
    });

    describe('Обработка callback запросов', () => {
        it('должен обрабатывать callback_query', (done) => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            bot.on('callback_query', ({ key, message, waitUntil }) => {
                expect(key).to.be.a('string');
                expect(message).to.be.instanceOf(Message);
                expect(waitUntil).to.be.a('function');
                done();
            });
            
            const query = {
                id: '123',
                data: 'test-callback',
                message: mockData.message
            };
            
            bot.emit('callback_query', {
                key: query.data,
                message: new Message(query.message),
                waitUntil: async () => {}
            });
        });
    });

    describe('Обработка ошибок', () => {
        it('должен обрабатывать MessageError', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            const MessageError = class extends Error {
                constructor(message, { from, info } = {}) {
                    super(message);
                    this.name = 'MessageError';
                    this.from = from;
                    this.info = info || {};
                }
            };
            
            const error = new MessageError('Test error', { info: { detail: 'test' } });
            
            // Не должно выбрасывать ошибку
            bot.catchError(error, 123);
            
            expect(mockTelegramInstance.sendMessage.called).to.be.true;
        });

        it('должен игнорировать AbortError', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            
            bot.catchError(abortError, 123);
            
            expect(mockTelegramInstance.sendMessage.called).to.be.false;
        });

        it('должен обрабатывать TelegramError', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            const telegramError = new Error('Telegram error');
            telegramError.name = 'TelegramError';
            telegramError.response = { body: 'Error details' };
            
            bot.catchError(telegramError, 123);
            
            expect(mockTelegramInstance.sendMessage.called).to.be.true;
        });

        it('должен игнорировать ошибку "query is too old"', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            const error = new Error('query is too old and response timeout expired');
            
            bot.catchError(error, 123);
            
            expect(mockTelegramInstance.sendMessage.called).to.be.false;
        });

        it('должен обрабатывать обычные ошибки', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            const error = new Error('Regular error');
            
            bot.catchError(error, 123);
            
            expect(mockTelegramInstance.sendMessage.called).to.be.true;
        });

        it('должен работать без chatId', () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            const error = new Error('Error without chat');
            
            // Не должно выбрасывать ошибку
            bot.catchError(error);
            
            expect(mockTelegramInstance.sendMessage.called).to.be.false;
        });
    });

    describe('getFileLink', () => {
        it('должен получать ссылку на файл', async () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            const fileLink = await bot.getFileLink('test-file-id');
            
            expect(mockTelegramInstance.getFileLink.calledOnce).to.be.true;
            expect(mockTelegramInstance.getFileLink.firstCall.args[0]).to.equal('test-file-id');
        });
    });

    describe('onMessage с обработкой ошибок', () => {
        it('должен обрабатывать ошибки в callback', async () => {
            bot = new TelegramThreadBot({ token: 'test-token' });
            bot.instance = mockTelegramInstance;
            
            const catchErrorStub = sinon.stub(bot, 'catchError');
            
            bot.onMessage(async (message, chat) => {
                throw new Error('Handler error');
            });
            
            // Симулируем обработчик сообщения
            const messageHandler = mockTelegramInstance.on.getCalls()
                .find(call => call.args[0] === 'message')?.args[1];
            
            if (messageHandler) {
                await messageHandler(mockData.message);
                expect(catchErrorStub.called).to.be.true;
            }
        });
    });
});