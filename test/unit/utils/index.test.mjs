import { expect } from '../../setup.mjs';
import { createInlineRows } from '../../../src/utils/index.mjs';

describe('Utils Unit Tests', () => {
    describe('createInlineRows', () => {
        it('должен создавать одну строку для небольших кнопок', () => {
            const buttons = [
                { text: 'A', action: () => {} },
                { text: 'B', action: () => {} }
            ];
            
            const rows = createInlineRows(buttons, 200);
            
            expect(rows).to.have.lengthOf(1);
            expect(rows[0]).to.have.lengthOf(2);
        });

        it('должен разделять кнопки на несколько строк при превышении ширины', () => {
            const buttons = [
                { text: 'Very long button text 1', action: () => {} },
                { text: 'Very long button text 2', action: () => {} },
                { text: 'Short', action: () => {} }
            ];
            
            const rows = createInlineRows(buttons, 200);
            
            expect(rows.length).to.be.greaterThan(1);
        });

        it('должен корректно работать с пустым массивом', () => {
            const buttons = [];
            
            const rows = createInlineRows(buttons);
            
            expect(rows).to.have.lengthOf(0);
        });

        it('должен использовать значение maxWidth по умолчанию', () => {
            const buttons = [
                { text: 'A', action: () => {} },
                { text: 'B', action: () => {} }
            ];
            
            const rows = createInlineRows(buttons);
            
            expect(rows).to.be.an('array');
        });

        it('должен добавлять последнюю строку даже если она неполная', () => {
            const buttons = [
                { text: 'Very long button text 1', action: () => {} },
                { text: 'Very long button text 2', action: () => {} },
                { text: 'A', action: () => {} }
            ];
            
            const rows = createInlineRows(buttons, 150);
            const lastRow = rows[rows.length - 1];
            
            expect(lastRow).to.include(buttons[2]);
        });
    });
});