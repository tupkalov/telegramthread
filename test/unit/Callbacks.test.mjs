import { expect, sinon } from '../setup.mjs';
import Callbacks, { callbackStore } from '../../src/Callbacks.mjs';

describe('Callbacks Unit Tests', () => {
    let callbacks;

    beforeEach(() => {
        callbacks = new Callbacks();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('setCallback', () => {
        it('должен создавать и сохранять callback', () => {
            const callback = sinon.stub().resolves('success');
            const id = callbacks.setCallback(callback);
            
            expect(id).to.be.a('string');
            expect(callbacks.isExists(id)).to.be.true;
        });

        it('должен возвращать уникальные ID', () => {
            const callback1 = sinon.stub().resolves('success');
            const callback2 = sinon.stub().resolves('success');
            
            const id1 = callbacks.setCallback(callback1);
            const id2 = callbacks.setCallback(callback2);
            
            expect(id1).to.not.equal(id2);
        });
    });

    describe('executeCallback', () => {
        it('должен выполнять callback и удалять его', async () => {
            const callback = sinon.stub().resolves('success');
            const id = callbacks.setCallback(callback);
            
            const result = await callbacks.executeCallback(id);
            
            expect(callback.calledOnce).to.be.true;
            expect(result).to.equal('success');
            expect(callbacks.isExists(id)).to.be.false;
        });

        it('должен обрабатывать ошибки в callback', async () => {
            const error = new Error('Test error');
            const callback = sinon.stub().rejects(error);
            const id = callbacks.setCallback(callback);
            
            const result = await callbacks.executeCallback(id);
            
            expect(callback.calledOnce).to.be.true;
            expect(result).to.be.undefined;
        });

        it('должен возвращать сообщение об ошибке если есть clientMessage', async () => {
            const error = new Error('Test error');
            error.clientMessage = true;
            const callback = sinon.stub().rejects(error);
            const id = callbacks.setCallback(callback);
            
            const result = await callbacks.executeCallback(id);
            
            expect(result).to.equal('Test error');
        });
    });

    describe('isExists', () => {
        it('должен проверять существование callback', () => {
            const callback = sinon.stub().resolves('success');
            const id = callbacks.setCallback(callback);
            
            expect(callbacks.isExists(id)).to.be.true;
            expect(callbacks.isExists('non-existent-id')).to.be.false;
        });
    });

    describe('callbackStore singleton', () => {
        it('должен экспортировать глобальный экземпляр', () => {
            expect(callbackStore).to.be.instanceOf(Callbacks);
        });
    });
});