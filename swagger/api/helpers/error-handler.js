"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rollbar_1 = require("./rollbar");
exports.errorHandler = (req, res, err) => {
    res.statusCode = 400;
    rollbar_1.rollbar.error(JSON.stringify(err), req);
    return res.json({ error: err });
};
//# sourceMappingURL=error-handler.js.map