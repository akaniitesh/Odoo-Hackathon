function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'The supplied resource identifier is invalid.' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ error: 'A record with that unique value already exists.' });
  }

  return res.status(error.statusCode || 500).json({
    error: error.expose ? error.message : 'An unexpected server error occurred.'
  });
}

module.exports = { errorHandler, notFoundHandler };

