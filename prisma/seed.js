require('dotenv').config();

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_ADDRESS, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_ADDRESS || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_ADDRESS, and ADMIN_PASSWORD before seeding.');
  }

  const password = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: ADMIN_NAME,
      address: ADMIN_ADDRESS,
      role: 'ADMIN',
    },
    create: {
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      address: ADMIN_ADDRESS,
      password,
      role: 'ADMIN',
    },
  });
  console.log(`Admin account is ready: ${ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error('Admin seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
