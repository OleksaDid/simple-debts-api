"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler = require("errorhandler");
const Rollbar = require("rollbar");
class ErrorHandler {
    constructor() {
        this.rollbar = new Rollbar(process.env.ROLLBAR_KEY);
        this.getHandler = () => {
            return process.env.ENVIRONMENT === 'LOCAL' ? errorHandler() : this.rollbar['errorHandler']();
        };
        this.errorHandler = (req, res, err) => {
            this.sendError(err, req);
            return res.status(400).json({ error: err });
        };
        this.sendError = (err, req) => {
            if (process.env.ENVIRONMENT !== 'LOCAL') {
                this.rollbar.error(JSON.stringify(err), req);
            }
            else {
                console.log(err);
            }
        };
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=error-handler.service.js.map