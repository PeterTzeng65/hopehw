const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/auth/login', (req, res) => {
    console.log('Login request received:', req.body);
    res.json({ success: true, message: 'Test login successful' });
});

app.get('/', (req, res) => {
    res.send('Test server is running!');
});

const server = app.listen(3008, '0.0.0.0', () => {
    console.log('Test server running on http://localhost:3008');
});

server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.log('Port 3008 is already in use, trying port 3009...');
        app.listen(3009, '0.0.0.0', () => {
            console.log('Test server running on http://localhost:3009');
        });
    }
});

process.on('SIGINT', () => {
    server.close(() => {
        console.log('Test server closed');
        process.exit(0);
    });
});