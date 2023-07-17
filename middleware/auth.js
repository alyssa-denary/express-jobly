"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  if (!res.locals.user) throw new UnauthorizedError();
  return next();
}

// TODO: improve documentation below - remove exact actions as these may change
// same feedback applies to ensureSameUserOrAdmin
/** Middleware to use for creating, updating, and deleting companies user must be admin
 * If not, raises Unauthorized
 */
function ensureIsAdmin(req, res, next) {
  if (res.locals.user && (res.locals.user.isAdmin === true)) {
    return next();
  }
  throw new UnauthorizedError();
}

/** Middleware for ensuring same user or admin for creating, updating, deleting
 * user
 * If not, raises Unauthorized
 */

function ensureSameUserOrAdmin(req, res, next) {
  if (!res.locals.user) throw new UnauthorizedError();

  const currentUser = res.locals.user;

  if (currentUser.username === req.params.username || currentUser.isAdmin === true) {
    return next();
  }

  throw new UnauthorizedError();
}


module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureIsAdmin,
  ensureSameUserOrAdmin
};
