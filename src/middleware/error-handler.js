const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON request body' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large' });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ message: 'A record with this value already exists' });
  }
  if (error.code === 'P2003') {
    return res.status(400).json({ message: 'Referenced record does not exist' });
  }
  console.error(error);
  return res.status(500).json({ message: 'Server error' });
};

module.exports = errorHandler;
