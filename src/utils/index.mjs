export function createInlineRows(buttons, maxWidth = 200) {
    let keyboard = [];
    let currentRow = [];
    let currentRowWidth = 0;

    buttons.forEach(button => {
        // Предположим, что ширина кнопки пропорциональна длине текста
        const buttonWidth = button.text.length * 10; // Пример: 10 пикселей на символ

        // Если добавление кнопки превышает максимальную ширину строки, начать новую строку
        if (currentRowWidth + buttonWidth > maxWidth) {
            keyboard.push(currentRow);
            currentRow = [];
            currentRowWidth = 0;
        }

        // Добавить кнопку в текущую строку
        currentRow.push(button);
        currentRowWidth += buttonWidth;
    });

    // Добавить последнюю строку, если она не пустая
    if (currentRow.length > 0) {
        keyboard.push(currentRow);
    }

    return keyboard;
}