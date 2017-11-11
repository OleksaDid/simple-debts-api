"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rollbar_1 = require("./rollbar");
// TODO: make static methods to not to create new class instance per each controller
class ErrorHandler {
    constructor() {
        this.errorHandler = (req, res, err) => {
            res.statusCode = 400;
            this.sendError(err, req);
            return res.json({ error: err });
        };
        this.sendError = (err, req) => {
            if (process.env.ENVIRONMENT !== 'LOCAL') {
                rollbar_1.rollbar.error(JSON.stringify(err), req);
            }
            else {
                console.log(err);
            }
        };
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=error-handler.js.map