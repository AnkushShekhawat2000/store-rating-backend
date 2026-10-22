const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const signup = async (req, res) => {
  const { name, email, address, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, address, password: hashed, role: 'USER' },
    select: { id: true, name: true, email: true, role: true },
  });
  res.status(201).json({ message: 'Signup successful', user });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
};

const updatePassword = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (!(await bcrypt.compare(req.body.oldPassword, user.password))) {
    return res.status(400).json({ message: 'Old password incorrect' });
  }

  const password = await bcrypt.hash(req.body.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password } });
  res.json({ message: 'Password updated' });
};

module.exports = { signup, login, updatePassword };
