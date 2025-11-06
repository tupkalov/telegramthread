import { expect, sinon } from '../setup.mjs';
import Message from '../../src/Message.mjs';
import Chat from '../../src/Chat.mjs';
import TelegramThreadBot from '../../src/TelegramThreadBot.mjs';
import { mockData } from '../fixtures/mockData.mjs';

describe('Message Unit Tests', () => {
    let bot;

    beforeEach(() => {
        bot = new TelegramThreadBot({ token: 'test-token' });
        bot.instance = {
            sendMessage: sinon.stub().resolves({ message_id: 123 }),
            sendChatAction: sinon.stub().resolves(true)
        };
        Chat.chats = {};
    });

    afterEach(() => {
        // Останавливаем все typing интервалы и потоки
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

    describe('Создание сообщения', () => {
        it('должен создавать экземпляр Message', () => {
            const message = new Message(mockData.message);
            
            expect(message).to.be.instanceOf(Message);
            expect(message.data).to.equal(mockData.message);
        });

        it('должен иметь доступ к ID сообщения', () => {
            const message = new Message(mockData.message);
            
            expect(message.id).to.equal(mockData.message.message_id);
        });

        it('должен иметь доступ к тексту сообщения', () => {
            const message = new Message(mockData.message);
            
            expect(message.text).to.equal(mockData.message.text);
        });
    });

    describe('Проверка типа сообщения', () => {
        it('должен определять текстовое сообщение', () => {
            const message = new Message(mockData.message);
            
            expect(message.isText()).to.be.true;
        });

        it('должен определять команду', () => {
            const commandMessage = {
                ...mockData.message,
                text: '/start',
                entities: [{ type: 'bot_command', offset: 0, length: 6 }]
            };
            const message = new Message(commandMessage);
            
            expect(message.isCommand()).to.be.true;
        });

        it('должен извлекать команды', () => {
            const commandMessage = {
                ...mockData.message,
                text: '/start hello',
                entities: [{ type: 'bot_command', offset: 0, length: 6 }]
            };
            const message = new Message(commandMessage);
            
            const commands = message.getCommands();
            expect(commands).to.have.lengthOf(1);
            expect(commands[0]).to.equal('/start');
        });

        it('должен получать текст без команд', () => {
            const commandMessage = {
                ...mockData.message,
                text: '/start привет мир',
                entities: [{ type: 'bot_command', offset: 0, length: 6 }]
            };
            const message = new Message(commandMessage);
            
            const text = message.getTextWithoutCommands();
            expect(text).to.equal('привет мир');
        });
    });

    describe('Работа с чатом', () => {
        it('должен иметь доступ к чату', () => {
            const message = new Message(mockData.message);
            
            expect(message.chat).to.be.instanceOf(Chat);
            expect(message.chat.id).to.equal(mockData.message.chat.id);
        });
    });

    describe('Проверка отправителя', () => {
        it('должен определять бота', () => {
            const botMessage = {
                ...mockData.message,
                from: { ...mockData.message.from, is_bot: true }
            };
            const message = new Message(botMessage);
            
            expect(message.isBot()).to.be.true;
        });

        it('должен определять не-бота', () => {
            const userMessage = {
                ...mockData.message,
                from: { ...mockData.message.user, is_bot: false }
            };
            const message = new Message(userMessage);
            
            expect(message.isBot()).to.be.false;
        });
    });

    describe('Работа с фото', () => {
        it('должен определять фото сообщение', () => {
            const photoData = {
                ...mockData.message,
                photo: [
                    { file_id: 'small', width: 100, height: 100 },
                    { file_id: 'large', width: 800, height: 600 }
                ],
                caption: 'Тестовое фото'
            };
            const photoMessage = new Message(photoData);
            
            expect(photoMessage.isPhoto()).to.equal(2);
            expect(photoMessage.data.photo.length).to.equal(2);
        });

        it('должен получать caption из фото', () => {
            const photoMessage = new Message({
                ...mockData.message,
                photo: [{ file_id: 'test' }],
                caption: 'Тестовая подпись'
            });
            
            expect(photoMessage.caption).to.equal('Тестовая подпись');
        });

        it('должен выбрасывать ошибку при получении caption из не-фото', () => {
            const message = new Message(mockData.message);
            
            try {
                const caption = message.caption;
                expect.fail('Должна быть ошибка');
            } catch (error) {
                expect(error.message).to.equal('Message is not a photo');
            }
        });

        it('должен получать file_id последнего фото', () => {
            const photoMessage = new Message({
                ...mockData.message,
                photo: [
                    { file_id: 'small' },
                    { file_id: 'large' }
                ]
            });
            
            expect(photoMessage.getFileId()).to.equal('large');
        });

        it('должен получать file_id по индексу', () => {
            const photoMessage = new Message({
                ...mockData.message,
                photo: [
                    { file_id: 'small' },
                    { file_id: 'large' }
                ]
            });
            
            expect(photoMessage.getFileId(0)).to.equal('small');
        });

        it('должен выбрасывать ошибку при getFileId для не-фото', () => {
            const message = new Message(mockData.message);
            
            try {
                message.getFileId();
                expect.fail('Должна быть ошибка');
            } catch (error) {
                expect(error.message).to.equal('Message is not a photo');
            }
        });

        it('должен получать последнее фото', () => {
            const photoMessage = new Message({
                ...mockData.message,
                photo: [
                    { file_id: 'small' },
                    { file_id: 'large' }
                ]
            });
            
            const lastPhoto = photoMessage.getLastPhoto();
            expect(lastPhoto.file_id).to.equal('large');
        });
    });

    describe('Работа с reply', () => {
        it('должен определять reply сообщение', () => {
            const replyMessage = new Message({
                ...mockData.message,
                reply_to_message: mockData.message
            });
            
            expect(replyMessage.isReply()).to.be.true;
        });

        it('должен определять не-reply сообщение', () => {
            const message = new Message(mockData.message);
            expect(message.isReply()).to.be.false;
        });

        it('должен получать ID reply сообщения', () => {
            const replyMessage = new Message({
                ...mockData.message,
                message_id: 999,
                reply_to_message: { ...mockData.message, message_id: 123 }
            });
            
            expect(replyMessage.getReplyId()).to.equal(123);
        });

        it('должен получать reply сообщение как объект', () => {
            const replyMessage = new Message({
                ...mockData.message,
                reply_to_message: mockData.message
            });
            
            const reply = replyMessage.getReply();
            expect(reply).to.be.instanceOf(Message);
            expect(reply.id).to.equal(mockData.message.message_id);
        });
    });

    describe('Другие методы', () => {
        it('должен получать from', () => {
            const message = new Message(mockData.message);
            expect(message.from).to.deep.equal(mockData.message.from);
        });

        it('должен получать date', () => {
            const message = new Message(mockData.message);
            expect(message.date).to.equal(mockData.message.date);
        });

        it('должен проверять текст через is', () => {
            const msgData = { ...mockData.message, text: 'Привет!' };
            const message = new Message(msgData);
            expect(message.is('Привет!')).to.be.true;
            expect(message.is('Другой текст')).to.be.false;
        });

        it('должен изменять текст', () => {
            const msgData = { ...mockData.message };
            const message = new Message(msgData);
            message.setText('Новый текст');
            expect(message.text).to.equal('Новый текст');
        });

        it('должен получать текст из getText для текстового сообщения', () => {
            const msgData = { ...mockData.message, text: 'Привет!' };
            const message = new Message(msgData);
            expect(message.getText()).to.equal('Привет!');
        });

        it('должен получать caption из getText для фото', () => {
            const photoMessage = new Message({
                ...mockData.message,
                photo: [{ file_id: 'test' }],
                caption: 'Подпись фото'
            });
            expect(photoMessage.getText()).to.equal('Подпись фото');
        });

        it('должен возвращать JSON', () => {
            const message = new Message(mockData.message);
            const json = message.toJSON();
            expect(json).to.deep.equal(mockData.message);
        });

        it('должен редактировать текст сообщения', async () => {
            // Добавляем editMessageText к существующему боту
            bot.instance.editMessageText = sinon.stub().resolves({
                message_id: mockData.message.message_id,
                chat: mockData.message.chat,
                text: 'Новый текст'
            });
            
            const msgData = { ...mockData.message };
            const message = new Message(msgData);
            
            const result = await message.editText('Новый текст');
            
            expect(bot.instance.editMessageText.calledOnce).to.be.true;
            expect(result).to.equal(message);
        });
    });
});