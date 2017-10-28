"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rollbar_1 = require("./rollbar");
exports.errorHandler = (req, res, err) => {
    res.statusCode = 400;
    if (process.env.ENVIRONMENT !== 'LOCAL') {
        rollbar_1.rollbar.error(JSON.stringify(err), req);
    }
    else {
        console.log(err);
    }
    return res.json({ error: err });
};
//# sourceMappingURL=error-handler.js.map