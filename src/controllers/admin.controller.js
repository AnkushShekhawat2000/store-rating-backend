const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');

const average = (ratings) =>
  ratings.length
    ? Number((ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length).toFixed(1))
    : 0;

const getOrder = (query, allowed, defaultField = 'name') => ({
  sortBy: allowed.includes(query.sortBy) ? query.sortBy : defaultField,
  order: query.order === 'desc' ? 'desc' : 'asc',
});

const contains = (value) => ({ contains: value, mode: 'insensitive' });

const getDashboard = async (req, res) => {
  const [totalUsers, totalStores, totalRatings] = await Promise.all([
    prisma.user.count(),
    prisma.store.count(),
    prisma.rating.count(),
  ]);
  res.json({ totalUsers, totalStores, totalRatings });
};

const createUser = async (req, res) => {
  const { name, email, address, password, role } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, address, password: hashed, role },
    select: { id: true, name: true, email: true, address: true, role: true },
  });
  res.status(201).json({ message: 'User created', user });
};

const createStore = async (req, res) => {
  const { name, email, address, ownerId } = req.body;
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner || owner.role !== 'STORE_OWNER') {
    return res.status(400).json({ message: 'ownerId must belong to a STORE_OWNER user' });
  }

  const existingStore = await prisma.store.findFirst({ where: { email } });
  if (existingStore) return res.status(409).json({ message: 'Store email already exists' });

  const store = await prisma.store.create({
    data: { name, email, address, ownerId },
  });
  res.status(201).json({ message: 'Store created', store });
};

const listUsers = async (req, res) => {
  const { name, email, address, role } = req.query;
  const { sortBy, order } = getOrder(req.query, ['name', 'email', 'address', 'role']);
  const where = {};
  if (name) where.name = contains(name);
  if (email) where.email = contains(email);
  if (address) where.address = contains(address);
  if (['ADMIN', 'USER', 'STORE_OWNER'].includes(role)) where.role = role;

  const users = await prisma.user.findMany({
    where,
    orderBy: { [sortBy]: order },
    select: { id: true, name: true, email: true, address: true, role: true },
  });
  res.json(users);
};

const listStores = async (req, res) => {
  const { name, email, address } = req.query;
  const { sortBy, order } = getOrder(req.query, ['name', 'email', 'address', 'rating']);
  const where = {};
  if (name) where.name = contains(name);
  if (email) where.email = contains(email);
  if (address) where.address = contains(address);

  const dbSort = sortBy !== 'rating';
  const stores = await prisma.store.findMany({
    where,
    ...(dbSort && { orderBy: { [sortBy]: order } }),
    include: { ratings: { select: { value: true } } },
  });
  const result = stores.map((store) => ({
    id: store.id,
    name: store.name,
    email: store.email,
    address: store.address,
    rating: average(store.ratings),
  }));
  if (!dbSort) {
    result.sort((a, b) => (order === 'asc' ? a.rating - b.rating : b.rating - a.rating));
  }
  res.json(result);
};

const getUserDetails = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      address: true,
      role: true,
      stores: {
        select: { name: true, ratings: { select: { value: true } } },
        take: 1,
      },
    },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const response = {
    id: user.id,
    name: user.name,
    email: user.email,
    address: user.address,
    role: user.role,
  };
  if (user.role === 'STORE_OWNER') {
    const store = user.stores[0];
    response.rating = store ? average(store.ratings) : null;
    response.storeName = store ? store.name : null;
  }
  res.json(response);
};

module.exports = { getDashboard, createUser, createStore, listUsers, listStores, getUserDetails };
