require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and contain at least 32 characters.');
}


const app = require('./app');
const prisma = require('./config/prisma');
const port = Number(process.env.PORT || 5000);

async function start() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port number.');
  }
  await prisma.$connect();
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(async (error) => {
  console.error('Server startup failed:', error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
