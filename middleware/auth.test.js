"use strict";

const jwt = require("jsonwebtoken");
const { UnauthorizedError } = require("../expressError");
const {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureSameUserOrAdmin
} = require("./auth");


const { SECRET_KEY } = require("../config");
const testJwt = jwt.sign({ username: "test", isAdmin: false }, SECRET_KEY);
const badJwt = jwt.sign({ username: "test", isAdmin: false }, "wrong");

function next(err) {
  if (err) throw new Error("Got error from middleware");
}

/* FIXME: Code review feedback lines 76/91/117:
Add type of error with message expected */


describe("authenticateJWT", function () {
  test("works: via header", function () {
    const req = { headers: { authorization: `Bearer ${testJwt}` } };
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({
      user: {
        iat: expect.any(Number),
        username: "test",
        isAdmin: false,
      },
    });
  });

  test("works: no header", function () {
    const req = {};
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });

  test("works: invalid token", function () {
    const req = { headers: { authorization: `Bearer ${badJwt}` } };
    const res = { locals: {} };
    authenticateJWT(req, res, next);
    expect(res.locals).toEqual({});
  });
});


describe("ensureLoggedIn", function () {
  test("works", function () {
    const req = {};
    const res = { locals: { user: { username: "test" } } };
    ensureLoggedIn(req, res, next);
  });

  test("unauth if no login", function () {
    const req = {};
    const res = { locals: {} };
    expect(() => ensureLoggedIn(req, res, next)).toThrowError();
  });
});

describe("ensureAdmin", function () {
  test("works", function () {
    const req = {};
    const res = { locals: { user: { username: "admin", isAdmin: true } } };
    ensureAdmin(req, res, next);
  });

  test("unauth if isAdmin false", function () {
    const req = {};
    const res = { locals: { user: { username: "admin", isAdmin: false } } }; //cahnge name
    expect(() => ensureAdmin(req, res, next))
      .toThrowError(new UnauthorizedError());
  });

  test("unauth if isAdmin other than true bool", function () {
    const req = {};
    const res = { locals: { user: { username: "admin", isAdmin: "true" } } };
    expect(() => ensureAdmin(req, res, next))
      .toThrowError(new UnauthorizedError());
  });

  test("unauth if no user", function () {
    const req = {};
    const res = { locals: {} };
    expect(() => ensureAdmin(req, res, next)).toThrowError();//specify unauth
  });
});

describe("ensureSameUserOrAdmin", function () {
  test("works - is same user", function () {
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "test" } } };
    ensureSameUserOrAdmin(req, res, next);
  });

  test("works - is admin user", function () {
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "admin", isAdmin: true } } };
    ensureSameUserOrAdmin(req, res, next);
  });

  test("unauth if not same user nor admin", function () {
    const req = { params: { username: "test" } };
    const res = { locals: { user: { username: "otherUser", isAdmin: false } } };
    expect(() => ensureSameUserOrAdmin(req, res, next)).toThrowError();
  });

  test("unauth if no user", function () {
    const req = { params: { username: "test" } };
    const res = { locals: {} };
    expect(() => ensureSameUserOrAdmin(req, res, next)).toThrowError();//specify error
  });
  //add same user and admin
});
