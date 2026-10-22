

const prisma = require('../config/prisma');

const average = (ratings) =>
  ratings.length
    ? Number(
        (
          ratings.reduce((sum, rating) => sum + rating.value, 0) /
          ratings.length
        ).toFixed(1)
      )
    : 0;

const contains = (value) => ({
  contains: value,
  mode: 'insensitive',
});

const listStores = async (req, res) => {
  try {
    const name =
      typeof req.query.name === 'string'
        ? req.query.name.trim()
        : '';

    const address =
      typeof req.query.address === 'string'
        ? req.query.address.trim()
        : '';

    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : '';

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const allowedSortFields = [
      'name',
      'address',
      'createdAt',
      'rating',
    ];

    const sortBy = allowedSortFields.includes(req.query.sortBy)
      ? req.query.sortBy
      : 'name';

    const order = req.query.order === 'desc' ? 'desc' : 'asc';

    const filters = [];

    if (name) {
      filters.push({ name: contains(name) });
    }

    if (address) {
      filters.push({ address: contains(address) });
    }

    if (search) {
      filters.push({
        OR: [
          { name: contains(search) },
          { address: contains(search) },
        ],
      });
    }

    const where = filters.length ? { AND: filters } : {};

    // console.log('GET /api/user/stores');
    // console.log('Query params:', req.query);
    // console.log('Prisma filters:', JSON.stringify(where));

    const total = await prisma.store.count({ where });

    console.log('Matching stores in database:', total);

    const include = {
      ratings: {
        select: {
          value: true,
          userId: true,
        },
      },
    };

    const stores = await prisma.store.findMany({
      where,
      include,
    });

    let result = stores.map((store) => {
      const myRating = req.user
        ? store.ratings.find(
            (rating) => rating.userId === req.user.id
          )
        : undefined;

      return {
        id: store.id,
        name: store.name,
        email: store.email,
        address: store.address,
        overallRating: average(store.ratings),
        totalRatings: store.ratings.length,
        myRating: myRating ? myRating.value : null,
      };
    });

    if (sortBy === 'rating') {
      result.sort((a, b) =>
        order === 'asc'
          ? a.overallRating - b.overallRating
          : b.overallRating - a.overallRating
      );
    } else {
      result.sort((a, b) => {
        const first = a[sortBy];
        const second = b[sortBy];

        if (first == null && second == null) return 0;
        if (first == null) return 1;
        if (second == null) return -1;

        const comparison =
          sortBy === 'createdAt'
            ? new Date(first) - new Date(second)
            : String(first).localeCompare(String(second));

        return order === 'asc' ? comparison : -comparison;
      });
    }

    const paginatedResult = result.slice(
      (page - 1) * limit,
      page * limit
    );

    res.set('Cache-Control', 'no-store');

    return res.status(200).json({
      stores: paginatedResult,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('listStores error:', error);

    return res.status(500).json({
      message: 'Failed to fetch stores',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};


const submitRating = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId);
    const userId = req.user.id;
    const { value } = req.body;

    // Check whether store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return res.status(404).json({
        message: 'Store not found',
      });
    }

    // Create or update user's rating
    const rating = await prisma.rating.upsert({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
      update: {
        value,
      },
      create: {
        userId,
        storeId,
        value,
      },
    });

    return res.status(200).json({
      message: 'Rating submitted successfully',
      rating,
    });
  } catch (error) {
    console.error('submitRating error:', error);

    return res.status(500).json({
      message: 'Failed to submit rating',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};


module.exports = {
  listStores,
  submitRating,
};
