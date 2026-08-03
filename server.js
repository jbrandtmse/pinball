const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🎮 Space Station Pinball Server Running`);
    console.log(`📍 Open your browser: http://localhost:${PORT}`);
    console.log(`\n⌨️  Controls:`);
    console.log(`   Z - Left Flipper`);
    console.log(`   M - Right Flipper`);
    console.log(`   Space - Launch Ball`);
    console.log(`   Q - Quit Game\n`);
});
