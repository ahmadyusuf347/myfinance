require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.get('/api/config', require('./api/config'));
app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Berjalan di http://localhost:${port}`));
