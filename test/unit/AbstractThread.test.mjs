import { expect, sinon } from '../setup.mjs';
import AbstractThread from '../../src/AbstractThread.mjs';
import Chat from '../../src/Chat.mjs';
import Message from '../../src/Message.mjs';
import TelegramThreadBot from '../../src/TelegramThreadBot.mjs';
import { mockData } from '../fixtures/mockData.mjs';

describe('AbstractThread Unit Tests', () => {
    let bot, chat, message;

    beforeEach(() => {
        bot = new TelegramThreadBot({ token: 'test-token' });
        bot.instance = {
            sendMessage: sinon.stub().resolves({ message_id: 123 }),
            sendChatAction: sinon.stub().resolves(true)
        };
        Chat.chats = {};
        
        message = new Message(mockData.message);
        chat = Chat.getByMessage(message);
        chat.setLastUserMessage(message);
    });

    afterEach(() => {
        sinon.restore();
        delete global._telegramthread_bot;
    });

    describe('Создание потока', () => {
        it('должен создавать экземпляр AbstractThread', () => {
            const processing = async (message, nextMessage) => {};
            const thread = new AbstractThread(chat, { processing });
            
            expect(thread).to.be.instanceOf(AbstractThread);
            expect(thread.chat).to.equal(chat);
        });

        it('должен выбрасывать ошибку если не передан chat', () => {
            expect(() => new AbstractThread(null, {})).to.throw('Chat is required');
        });
    });

    describe('Обработка сообщений', () => {
        it('должен запускать processing функцию', async () => {
            const processingSpy = sinon.spy(async (message, nextMessage) => {});
            const thread = new AbstractThread(chat, { processing: processingSpy });
            
            await thread.process(message);
            
            expect(processingSpy.calledOnce).to.be.true;
        });

        it('должен останавливать поток после завершения', async () => {
            const processing = async (message, nextMessage) => {};
            const thread = new AbstractThread(chat, { processing });
            
            await thread.process(message);
            
            expect(thread.stopped).to.be.true;
        });
    });

    describe('Остановка потока', () => {
        it('должен останавливать поток', () => {
            const processing = async (message, nextMessage) => {};
            const thread = new AbstractThread(chat, { processing });
            
            thread.stop();
            
            expect(thread.stopped).to.be.true;
        });

        it('должен эмитить событие stop', (done) => {
            const processing = async (message, nextMessage) => {};
            const thread = new AbstractThread(chat, { processing });
            
            thread.on('stop', () => {
                expect(thread.stopped).to.be.true;
                done();
            });
            
            thread.stop();
        });

        it('не должен останавливать дважды', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            const stopSpy = sinon.spy();
            
            thread.on('stop', stopSpy);
            
            thread.stop();
            thread.stop();
            
            expect(stopSpy.calledOnce).to.be.true;
        });

        it('должен удалять поток из чата', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            chat.thread = thread;
            
            thread.stop();
            
            expect(chat.thread).to.be.undefined;
        });

        it('должен передавать ошибку при остановке', (done) => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            const testError = new Error('Test stop error');
            
            thread.on('stop', (error) => {
                expect(error).to.equal(testError);
                done();
            });
            
            thread.stop(testError);
        });
    });

    describe('Получение сообщения', () => {
        it('должен получать lastMessage из message геттера', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            
            expect(thread.message).to.exist;
        });

        it('должен блокировать вызовы методов если поток остановлен', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            thread.stop();
            
            const result = thread.message.someMethod?.();
            expect(result).to.be.undefined;
        });
    });

    describe('Ожидание следующего сообщения', () => {
        it('должен возвращать промис при getNextMessage', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            
            const promise = thread.getNextMessage();
            
            expect(promise).to.be.instanceof(Promise);
            
            // Резолвим промис чтобы не было предупреждений
            thread._waitingMessage(message);
        });

        it('должен выбрасывать ошибку если поток остановлен', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            thread.stop();
            
            try {
                thread.getNextMessage();
                expect.fail('Должна быть ошибка');
            } catch (error) {
                expect(error.message).to.equal('Thread stopped');
            }
        });

        it('должен сохранять опции ожидания', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            const options = { image: true };
            
            thread.getNextMessage(options);
            
            expect(thread._waitingOptions).to.deep.equal(options);
            
            thread._waitingMessage(message);
        });

        it('должен проверять ожидание изображения', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            
            thread.getNextMessage({ image: true });
            
            expect(thread.isWaitingImage()).to.be.true;
            
            thread._waitingMessage(message);
        });
    });

    describe('Обработка nextMessage в process', () => {
        it('должен передавать nextMessage в processing', async () => {
            let receivedNextMessage;
            
            const processingFunc = async (message, nextMessage) => {
                receivedNextMessage = nextMessage;
            };
            
            const thread = new AbstractThread(chat, { processing: processingFunc });
            await thread.process(message);
            
            expect(receivedNextMessage).to.be.a('function');
        });

        it('должен вызывать _waitingMessage при повторном сообщении', async () => {
            let receivedSecondMessage = false;
            
            const processingFunc = async (firstMsg, nextMessage) => {
                const secondMsg = await nextMessage();
                if (secondMsg.text === 'Second') {
                    receivedSecondMessage = true;
                }
            };
            
            const mockChat = {
                startTyping: sinon.stub(),
                stopTyping: sinon.stub(),
                catchError: sinon.stub(),
                bot: { instance: {} },
                lastUserMessage: message
            };
            
            const thread = new AbstractThread(mockChat, { processing: processingFunc });
            
            // Первый вызов
            const promise = thread.process(message);
            
            // Даем время чтобы processing начал выполняться
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Второй вызов (должен быть обработан как ожидаемое сообщение)
            thread.process({ text: 'Second' });
            
            await promise;
            
            expect(receivedSecondMessage).to.be.true;
        });
    });

    describe('Обработка ошибок', () => {
        it('должен вызывать catchError при ошибке', async () => {
            const processingFunc = async () => {
                throw new Error('Processing error');
            };
            
            const mockChat = {
                startTyping: sinon.stub(),
                stopTyping: sinon.stub(),
                catchError: sinon.stub(),
                bot: { instance: {} },
                lastUserMessage: message
            };
            
            const thread = new AbstractThread(mockChat, { processing: processingFunc });
            await thread.process(message);
            
            expect(mockChat.catchError.calledOnce).to.be.true;
        });

        it('не должен вызывать catchError для Thread stopped', async () => {
            const processingFunc = async (message, nextMessage) => {
                throw new Error('Thread stopped');
            };
            
            const mockChat = {
                startTyping: sinon.stub(),
                stopTyping: sinon.stub(),
                catchError: sinon.stub(),
                bot: { instance: {} },
                lastUserMessage: message
            };
            
            const thread = new AbstractThread(mockChat, { processing: processingFunc });
            await thread.process(message);
            
            expect(mockChat.catchError.called).to.be.false;
        });
    });

    describe('Геттеры', () => {
        it('должен получать bot из чата', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            
            expect(thread.bot).to.exist;
        });

        it('должен возвращать stopError', () => {
            const processing = async () => {};
            const thread = new AbstractThread(chat, { processing });
            
            const error = thread.stopError();
            expect(error).to.be.instanceof(Error);
            expect(error.message).to.equal('Thread stopped');
        });
    });
});