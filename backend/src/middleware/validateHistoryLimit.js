export function validateHistoryLimit(req, res, next) {
  if (req.query.limit === undefined) {
    req.historyLimit = 10;
    return next();
  }

  const limit = Number(req.query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    return res.status(400).json({
      error: 'The limit query parameter must be an integer between 1 and 50.',
    });
  }

  req.historyLimit = limit;
  return next();
}
