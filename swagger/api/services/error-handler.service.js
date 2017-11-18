"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Raven = require("raven");
const response_error_1 = require("../common/response-error");
class ErrorHandler {
    constructor() {
        this.ravenOptions = {
            environment: process.env.ENVIRONMENT,
            release: process.env.SENTRY_RELEASE,
            parseUser: true,
            captureUnhandledRejections: true,
            autoBreadcrumbs: true
        };
        this.getRequestHandler = () => {
            return this._raven.requestHandler();
        };
        this.getErrorHandler = () => {
            return this._raven.errorHandler();
        };
        this.captureError = (err, req) => {
            let error;
            if (typeof err === 'string') {
                error = err;
            }
            else if (err.message) {
                error = err.message;
            }
            else {
                error = JSON.stringify(err);
            }
            if (process.env.ENVIRONMENT !== 'LOCAL') {
                this._raven.captureException(error, { req });
            }
            console.log(error);
        };
        this.responseError = (req, res, err) => {
            this.captureError(err, req);
            return res.status(400).json(new response_error_1.ResponseError(err));
        };
        this.finalErrorHandler = (err, req, res, next) => {
            if (!res.headersSent) {
                res.status(500);
            }
            res.json(new response_error_1.ResponseError(err));
        };
        this.setup = () => {
            this._raven.config(process.env.RAVEN_LINK, this.ravenOptions).install();
        };
        if (ErrorHandler._instance) {
            return ErrorHandler._instance;
        }
        this._raven = Raven;
        this.setup();
        ErrorHandler._instance = this;
    }
}
exports.ErrorHandler = ErrorHandler;
//# sourceMappingURL=error-handler.service.js.map