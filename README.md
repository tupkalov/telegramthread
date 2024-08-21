## Install
```bash
npm install telegramthread
```

## Usage

**Create a new bot**
```javascript
const { Bot } = require('telegramthread');

// You can use process.env.TELEGRAM_BOT_TOKEN or pass { token } to the constructor
const bot = new Bot();

bot.start();

console.log('Bot started!');
```

**Create a new thread**
```javascript
async function thread (chat, photoMessage, getNextMessage) {
    // Send a message to the user to send a caption for the photo
    await chat.sendText('Send caption for the photo');
    // Get the next message from the user
    const captionMessage = await getNextMessage();
    // Send the photo with the caption
    await chat.sendPhoto(photoMessage.getFileId(), {
        caption: captionMessage.text
    });
}
```

**Handle the thread and messages**
```javascript
bot.onMessage(async (message, chat) => {

    // default start message. We will inform the user to send a photo
    if (message.is('/start')) {
        await chat.sendText('Hello! Send a photo!');
    }
    
    // If the user sent a photo then start the "thread" from message
    else if (message.isPhoto()) {
        await chat.startThread(thread);
    }

    // If there is no thread, then the user sent a photo without a command
    else if (!chat.thread) {
        await chat.sendText('Send a photo!');
    }
    
});
```