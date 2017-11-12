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
const errorHandler = require("errorhandler");
const rollbar_1 = require("./api/helpers/rollbar");
const error_handler_1 = require("./api/helpers/error-handler");
/**
 * Controllers (route handlers).
 */
const auth_1 = require("./api/controllers/auth");
const users_1 = require("./api/controllers/users");
const debts_1 = require("./api/controllers/debts");
const moneyOperation_1 = require("./api/controllers/moneyOperation");
class App {
    constructor() {
        this.MongoStore = mongo(session);
        this.errHandler = new error_handler_1.ErrorHandler();
        this.authController = new auth_1.AuthController();
        this.usersController = new users_1.UsersController();
        this.debtsController = new debts_1.DebtsController();
        this.operationsController = new moneyOperation_1.OperationsController();
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
        mongoose.connect(mongoServer);
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
        const v1 = this.getV1Routes(express.Router());
        this.app.use('/v1', v1);
        this.app.use('/', v1); // Set the default version to latest.
    }
    getV1Routes(v1) {
        // DEBTS
        v1.get('/debts', this.authController.checkJWTAccess, this.debtsController.getAllUserDebts);
        v1.put('/debts', this.authController.checkJWTAccess, this.debtsController.createNewDebt);
        v1.get('/debts/:id', this.authController.checkJWTAccess, this.debtsController.getDebtsById);
        v1.delete('/debts/:id', this.authController.checkJWTAccess, this.debtsController.deleteMultipleDebts);
        v1.post('/debts/:id/creation', this.authController.checkJWTAccess, this.debtsController.acceptCreation);
        v1.delete('/debts/:id/creation', this.authController.checkJWTAccess, this.debtsController.declineCreation);
        v1.put('/debts/single', this.authController.checkJWTAccess, this.debtsController.createSingleDebt);
        v1.delete('/debts/single/:id', this.authController.checkJWTAccess, this.debtsController.deleteSingleDebt);
        v1.put('/debts/single/:id/connect_user', this.authController.checkJWTAccess, this.debtsController.connectUserToSingleDebt);
        v1.post('/debts/single/:id/connect_user', this.authController.checkJWTAccess, this.debtsController.acceptUserConnection);
        v1.delete('/debts/single/:id/connect_user', this.authController.checkJWTAccess, this.debtsController.declineUserConnection);
        v1.post('/debts/single/:id/i_love_lsd', this.authController.checkJWTAccess, this.debtsController.acceptUserDeletedStatus);
        // MONEY OPERATIONS
        v1.put('/operation', this.authController.checkJWTAccess, this.operationsController.createOperation);
        v1.delete('/operation/:id', this.authController.checkJWTAccess, this.operationsController.deleteOperation);
        v1.post('/operation/:id/creation', this.authController.checkJWTAccess, this.operationsController.acceptOperation);
        v1.delete('/operation/:id/creation', this.authController.checkJWTAccess, this.operationsController.declineOperation);
        // USERS
        v1.get('/users', this.authController.checkJWTAccess, this.usersController.getUsersArrayByName);
        v1.patch('/users', this.authController.checkJWTAccess, this.usersController.uploadImage, this.usersController.updateUserData);
        // AUTH
        v1.put('/signup/local', this.authController.localSignUp);
        v1.post('/login/local', this.authController.localLogin);
        v1.get('/login/facebook', this.authController.facebookLogin);
        v1.get('/login_status', this.authController.checkJWTAccess, this.authController.checkLoginStatus);
        return v1;
    }
    setupErrorHandler() {
        const handler = process.env.ENVIRONMENT === 'LOCAL' ? errorHandler() : rollbar_1.rollbar.errorHandler();
        this.app.use(handler);
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map