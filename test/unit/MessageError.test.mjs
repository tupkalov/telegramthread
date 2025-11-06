import { expect } from '../setup.mjs';
import MessageError from '../../src/MessageError.mjs';

describe('MessageError Unit Tests', () => {
    describe('Создание ошибки', () => {
        it('должен создавать экземпляр MessageError', () => {
            const error = new MessageError('Test error', {});
            
            expect(error).to.be.instanceOf(MessageError);
            expect(error).to.be.instanceOf(Error);
            expect(error.message).to.equal('Test error');
            expect(error.name).to.equal('MessageError');
        });

        it('должен сохранять clientMessage', () => {
            const error = new MessageError('Test error', { clientMessage: 'User error' });
            
            expect(error.clientMessage).to.equal('User error');
        });

        it('должен сохранять вложенную ошибку', () => {
            const innerError = new Error('Inner error');
            const error = new MessageError('Test error', { error: innerError });
            
            expect(error.error).to.equal(innerError);
        });

        it('должен использовать from как error если error не указан', () => {
            const innerError = new Error('Inner error');
            const error = new MessageError('Test error', { from: innerError });
            
            expect(error.error).to.equal(innerError);
        });

        it('должен сохранять дополнительную информацию', () => {
            const info = { code: 404, details: 'Not found' };
            const error = new MessageError('Test error', { info });
            
            expect(error.info).to.deep.equal(info);
        });

        it('должен создавать пустой объект info по умолчанию', () => {
            const error = new MessageError('Test error', {});
            
            expect(error.info).to.deep.equal({});
        });
    });

    describe('Проверка свойств', () => {
        it('должен корректно работать с stack trace', () => {
            const error = new MessageError('Test error', {});
            
            expect(error.stack).to.be.a('string');
            expect(error.stack).to.include('MessageError');
            expect(error.stack).to.include('Test error');
        });
    });
});