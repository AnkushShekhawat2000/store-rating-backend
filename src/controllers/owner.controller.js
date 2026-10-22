const prisma = require('../config/prisma');

const getDashboard = async (req, res) => {
  const stores = await prisma.store.findMany({
    where: { ownerId: req.user.id },
    orderBy: { name: 'asc' },
    include: {
      ratings: {
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, address: true } },
        },
      },
    },
  });
  if (!stores.length) {
    return res.status(404).json({ message: 'No store assigned to this owner yet' });
  }

  const result = stores.map((store) => {
    const averageRating = store.ratings.length
      ? Number(
          (
            store.ratings.reduce((sum, rating) => sum + rating.value, 0) /
            store.ratings.length
          ).toFixed(2)
        )
      : null;
    return {
      id: store.id,
      name: store.name,
      email: store.email,
      address: store.address,
      averageRating,
      totalRatings: store.ratings.length,
      ratings: store.ratings.map((rating) => ({
        id: rating.id,
        score: rating.value,
        updatedAt: rating.updatedAt,
        user: rating.user,
      })),
    };
  });
  const primaryStore = result[0];

  res.json({
    stores: result,
    store: primaryStore,
    averageRating: primaryStore.averageRating ?? 0,
    totalRatings: primaryStore.totalRatings,
    raters: primaryStore.ratings.map((rating) => ({
      userId: rating.user.id,
      name: rating.user.name,
      email: rating.user.email,
      address: rating.user.address,
      value: rating.score,
      date: rating.updatedAt,
    })),
  });
};

module.exports = { getDashboard };
