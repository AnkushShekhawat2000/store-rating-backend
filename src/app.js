const cors = require('cors');
const express = require('express');
const errorHandler = require('./middleware/error-handler');

const app = express();


app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/user', require('./routes/user.routes'));
app.use('/api/owner', require('./routes/owner.routes'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
