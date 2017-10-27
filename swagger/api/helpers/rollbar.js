"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rollbar = require("rollbar");
const rollbar = new Rollbar(process.env.ROLLBAR_KEY);
exports.rollbar = rollbar;
//# sourceMappingURL=rollbar.js.map