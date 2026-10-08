// Pagination + tri + recherche standardisés de l'API.
// Query : ?page=&limit=&search=&tri=&ordre=
function parsePagination(req, options = {}) {
  const maxLimit = options.maxLimit || 100;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const tri = typeof req.query.tri === 'string' && req.query.tri ? req.query.tri : null;
  const ordre = req.query.ordre === 'desc' ? 'desc' : 'asc';

  return { page, limit, skip: (page - 1) * limit, take: limit, search, tri, ordre };
}

// Construit la réponse paginée standard.
function paginated(items, total, { page, limit }) {
  return {
    donnees: items,
    pagination: {
      page,
      limite: limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

module.exports = { parsePagination, paginated };
