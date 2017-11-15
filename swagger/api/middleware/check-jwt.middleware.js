"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
const checkJWTAccess = passport.authenticate('jwt', { session: false });
exports.default = checkJWTAccess;
//# sourceMappingURL=check-jwt.middleware.js.map