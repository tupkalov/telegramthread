import { expect, sinon } from '../setup.mjs';
import Chat from '../../src/Chat.mjs';
import Message from '../../src/Message.mjs';
import TelegramThreadBot from '../../src/TelegramThreadBot.mjs';
import { mockData } from '../fixtures/mockData.mjs';

describe('Chat Integration Tests', () => {
    let bot;
    let mockTelegramInstance;

    beforeEach(() => {
        // Создаем мок Telegram API
        mockTelegramInstance = {
            sendMessage: sinon.stub().resolves({ 
                message_id: 123,
                chat: mockData.message.chat,
                from: { id: 999, is_bot: true },
                text: 'Response text'
            }),
            sendChatAction: sinon.stub().resolves(true),
            editMessageText: sinon.stub().resolves(true)
        };

        // Создаем бота без реального токена
        bot = new TelegramThreadBot({ token: 'test-token' });
        bot.instance = mockTelegramInstance;
        
        // Очищаем кеш чатов
        Chat.chats = {};
    });

    afterEach(() => {
        // Останавливаем все typing интервалы
        Object.values(Chat.chats || {}).forEach(chat => {
            if (chat.stopTyping) {
                chat.stopTyping();
            }
        });
        
        sinon.restore();
        delete global._telegramthread_bot;
        Chat.chats = {};
    });

    describe('Chat.getByMessage', () => {
        it('должен создавать новый чат если его нет', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            expect(chat).to.be.instanceOf(Chat);
            expect(chat.id).to.equal(mockData.message.chat.id);
        });

        it('должен возвращать существующий чат', () => {
            const message = new Message(mockData.message);
            const chat1 = Chat.getByMessage(message);
            const chat2 = Chat.getByMessage(message);
            
            expect(chat1).to.equal(chat2);
        });
    });

    describe('chat.sendText', () => {
        it('должен отправлять текстовое сообщение', async () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            await chat.sendText('Тестовое сообщение');
            
            expect(mockTelegramInstance.sendMessage.calledOnce).to.be.true;
            expect(mockTelegramInstance.sendMessage.firstCall.args[0]).to.equal(chat.id);
        });
    });

    describe('chat.startTyping / stopTyping', () => {
        it('должен отправлять typing action', async () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            chat.startTyping();
            
            // Даем время на первый вызов
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockTelegramInstance.sendChatAction.called).to.be.true;
            expect(mockTelegramInstance.sendChatAction.firstCall.args[1]).to.equal('typing');
            
            // Останавливаем typing сразу
            chat.stopTyping();
            
            // Даем время на очистку интервала
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        it('должен поддерживать разные типы typing action', async () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            chat.startTyping('upload_photo');
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockTelegramInstance.sendChatAction.firstCall.args[1]).to.equal('upload_photo');
            chat.stopTyping();
        });
    });

    describe('chat.is', () => {
        it('должен проверять соответствие ID чата', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            expect(chat.is(mockData.message.chat.id)).to.be.true;
            expect(chat.is(99999)).to.be.false;
        });
    });

    describe('chat.sendPhoto', () => {
        it('должен отправлять фото', async () => {
            mockTelegramInstance.sendPhoto = sinon.stub().resolves({
                message_id: 456,
                chat: mockData.message.chat,
                from: { id: 999, is_bot: true },
                photo: [{ file_id: 'test-file-id' }]
            });
            
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            await chat.sendPhoto('test-file-id', { caption: 'Test caption' });
            
            expect(mockTelegramInstance.sendPhoto.calledOnce).to.be.true;
            expect(mockTelegramInstance.sendPhoto.firstCall.args[1]).to.equal('test-file-id');
        });

        it('должен отправлять фото с inline клавиатурой', async () => {
            mockTelegramInstance.sendPhoto = sinon.stub().resolves({
                message_id: 456,
                chat: mockData.message.chat,
                from: { id: 999, is_bot: true },
                photo: [{ file_id: 'test-file-id' }]
            });
            
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            await chat.sendPhoto('test-file-id', {
                inlineKeyboard: [[{ text: 'Кнопка', action: async () => {} }]]
            });
            
            expect(mockTelegramInstance.sendPhoto.calledOnce).to.be.true;
            const sendOptions = mockTelegramInstance.sendPhoto.firstCall.args[2];
            expect(sendOptions.reply_markup).to.exist;
        });
    });

    describe('chat.editTextMessage', () => {
        it('должен редактировать сообщение', async () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            await chat.editTextMessage(123, 'Новый текст');
            
            expect(mockTelegramInstance.editMessageText.calledOnce).to.be.true;
        });

        it('должен выбрасывать ошибку если текст пустой', async () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            try {
                await chat.editTextMessage(123, '');
                expect.fail('Должна быть ошибка');
            } catch (error) {
                expect(error.message).to.equal('Text is required');
            }
        });
    });

    describe('chat.sendMediaGroup', () => {
        it('должен отправлять медиа группу', async () => {
            mockTelegramInstance.sendMediaGroup = sinon.stub().resolves([
                { message_id: 456, chat: mockData.message.chat }
            ]);
            
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            const media = [
                { type: 'photo', media: 'file-id-1' },
                { type: 'photo', media: 'file-id-2' }
            ];
            
            await chat.sendMediaGroup(media);
            
            expect(mockTelegramInstance.sendMediaGroup.calledOnce).to.be.true;
        });
    });

    describe('chat.startThread / stopThread', () => {
        it('должен запускать поток с функцией', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            const processingFunc = async (message, nextMessage) => {
                // Простая функция обработки
            };
            
            chat.startThread(processingFunc, message);
            
            expect(chat.thread).to.exist;
        });

        it('должен останавливать активный поток при запуске нового', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            const processingFunc1 = async () => {};
            const processingFunc2 = async () => {};
            
            chat.startThread(processingFunc1, message);
            const firstThread = chat.thread;
            
            chat.startThread(processingFunc2, message);
            
            expect(firstThread.stopped).to.be.true;
        });

        it('должен останавливать поток вручную', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            const processingFunc = async () => {};
            
            chat.startThread(processingFunc, message);
            chat.stopThread();
            
            expect(chat.thread).to.not.exist;
        });
    });

    describe('chat.setLastUserMessage', () => {
        it('должен сохранять последнее сообщение пользователя', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            chat.setLastUserMessage(message);
            
            expect(chat.lastUserMessage).to.equal(message);
        });
    });

    describe('chat.catchError', () => {
        it('должен вызывать catchError бота', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            const catchErrorStub = sinon.stub(bot, 'catchError');
            const testError = new Error('Test error');
            
            chat.catchError(testError);
            
            expect(catchErrorStub.calledOnce).to.be.true;
            expect(catchErrorStub.firstCall.args[0]).to.equal(testError);
            expect(catchErrorStub.firstCall.args[1]).to.equal(chat.id);
        });
    });

    describe('chat.toJSON', () => {
        it('должен возвращать данные чата в JSON формате', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            const json = chat.toJSON();
            
            expect(json).to.deep.equal(mockData.message.chat);
        });
    });

    describe('chat.processSendOptions', () => {
        it('должен обрабатывать inline клавиатуру', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            const options = {
                inlineKeyboard: [[{ text: 'Кнопка', action: async () => {} }]]
            };
            
            const sendOptions = chat.processSendOptions(options);
            
            expect(sendOptions.reply_markup).to.exist;
            expect(sendOptions.reply_markup.inline_keyboard).to.be.an('array');
        });

        it('должен обрабатывать replyTo', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            const replyMessage = new Message({ ...mockData.message, message_id: 999 });
            const sendOptions = chat.processSendOptions({ replyTo: replyMessage });
            
            expect(sendOptions.reply_parameters).to.exist;
            expect(sendOptions.reply_parameters.message_id).to.equal(999);
        });

        it('должен выбрасывать ошибку если нет action и callbackKey', () => {
            const message = new Message(mockData.message);
            const chat = Chat.getByMessage(message);
            
            try {
                chat.processSendOptions({
                    inlineKeyboard: [[{ text: 'Кнопка' }]]
                });
                expect.fail('Должна быть ошибка');
            } catch (error) {
                expect(error.message).to.equal('Action or callbackKey is required');
            }
        });
    });
});