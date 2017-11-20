"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Setup environment first of all
 */
const dotenv = require("dotenv");
if (!process.env.ENVIRONMENT) {
    dotenv.config({ path: __dirname + '/config/.env.example' });
}
/**
 * Module dependencies.
 */
const express = require("express");
const compression = require("compression"); // compresses requests
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const passport = require("passport");
const helmet = require("helmet");
const Ddos = require("ddos");
const expressValidator = require("express-validator");
const routes_module_1 = require("./api/modules/routes.module");
const error_handler_service_1 = require("./api/services/error-handler.service");
class App {
    constructor() {
        this.errHandler = new error_handler_service_1.ErrorHandler();
        this.routesModule = new routes_module_1.RoutesModule();
        this.ddos = new Ddos;
        this.app = express();
        this.setupMongoConnection();
        this.expressConfig();
        this.setupRequestHandler();
        this.setupRoutes();
        this.setupErrorHandler();
    }
    get application() {
        return this.app;
    }
    setupMongoConnection() {
        const mongoServer = process.env.ENVIRONMENT === 'LOCAL' ? process.env.MONGODB_URI : process.env.MONGOLAB_URI;
        mongoose.Promise = global.Promise;
        mongoose.connect(mongoServer, {
            useMongoClient: true
        });
        mongoose.connection.on('error', () => {
            this.errHandler.captureError('MongoDB connection error. Please make sure MongoDB is running.');
            process.exit();
        });
    }
    expressConfig() {
        this.app.set('port', process.env.PORT || 10010);
        this.app.use(compression());
        this.app.use(logger('dev'));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(expressValidator());
        this.app.use(passport.initialize());
        this.app.use(express.static('public', { maxAge: 31557600000 }));
        this.securityConfig();
    }
    securityConfig() {
        this.app.use(helmet());
        this.app.use(helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"]
            }
        }));
        if (process.env.ENVIRONMENT !== 'LOCAL') {
            this.app.use(this.ddos.express);
        }
    }
    setupRequestHandler() {
        this.app.use(this.errHandler.getRequestHandler());
    }
    setupRoutes() {
        const v1 = this.routesModule.getV1Routes(express.Router());
        this.app.use('/v1', v1);
        this.app.use('/', v1); // Set the default version to latest.
    }
    setupErrorHandler() {
        this.app.use(this.errHandler.getErrorHandler());
        this.app.use(this.errHandler.finalErrorHandler);
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map