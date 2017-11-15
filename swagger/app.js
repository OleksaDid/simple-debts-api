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
const session = require("express-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const logger = require("morgan");
const lusca = require("lusca");
const mongo = require("connect-mongo");
const flash = require("express-flash");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const expressValidator = require("express-validator");
const cors = require("cors");
const routes_module_1 = require("./api/modules/routes.module");
const error_handler_service_1 = require("./api/services/error-handler.service");
class App {
    constructor() {
        this.MongoStore = mongo(session);
        this.errHandler = new error_handler_service_1.ErrorHandler();
        this.routesModule = new routes_module_1.RoutesModule();
        this.app = express();
        this.setupMongoConnection();
        this.expressConfig();
        this.allowCORS();
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
            this.errHandler.sendError('MongoDB connection error. Please make sure MongoDB is running.');
            process.exit();
        });
    }
    expressConfig() {
        this.app.set('port', process.env.PORT || 10010);
        this.app.set('views', path.join(__dirname, '../views'));
        this.app.set('view engine', 'html');
        this.app.use(compression());
        this.app.use(logger('dev'));
        this.app.use(cookieParser());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(expressValidator());
        this.app.use(session({
            resave: true,
            saveUninitialized: true,
            secret: process.env.SESSION_SECRET,
            store: new this.MongoStore({
                url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
                autoReconnect: true
            })
        }));
        this.app.use(passport.initialize());
        this.app.use(flash());
        this.app.use(lusca.xframe('SAMEORIGIN'));
        this.app.use(lusca.xssProtection(true));
        this.app.use((req, res, next) => {
            res.locals.user = req.user;
            next();
        });
        this.app.use(express.static('public', { maxAge: 31557600000 }));
    }
    allowCORS() {
        const corsOptions = {
            origin: 'http://127.0.0.1:59074',
            optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
        };
        this.app.use(cors(corsOptions));
    }
    setupRoutes() {
        const v1 = this.routesModule.getV1Routes(express.Router());
        this.app.use('/v1', v1);
        this.app.use('/', v1); // Set the default version to latest.
    }
    setupErrorHandler() {
        this.app.use(this.errHandler.getHandler());
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map