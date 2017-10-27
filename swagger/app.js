"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
const dotenv = require("dotenv");
const mongo = require("connect-mongo");
const flash = require("express-flash");
const path = require("path");
const mongoose = require("mongoose");
const passport = require("passport");
const nodemailerConfig = require("./api/helpers/nodemailer");
const expressValidator = require("express-validator");
const cors = require("cors");
const MongoStore = mongo(session);
/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
if (!process.env.ENVIRONMENT) {
    dotenv.config({ path: __dirname + '/config/.env.dev' });
}
/**
 * Controllers (route handlers).
 */
const authController = require("./api/controllers/auth");
const usersController = require("./api/controllers/users");
const debtsController = require("./api/controllers/debts");
const operationsController = require("./api/controllers/moneyOperation");
/**
 * API keys and Passport configuration.
 */
const passportConfig = require("./api/helpers/passport");
const rollbar_1 = require("./api/helpers/rollbar");
/**
 * Create Express server.
 */
const app = express();
/**
 * Swagger config
 */
module.exports = app; // for testing
/**
 * Connect to MongoDB.
 */
// mongoose.Promise = global.Promise;
mongoose.connect(process.env.ENVIRONMENT === 'DEV' ? process.env.MONGODB_URI : process.env.MONGOLAB_URI);
mongoose.connection.on('error', () => {
    console.log('MongoDB connection error. Please make sure MongoDB is running.');
    process.exit();
});
/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 10010);
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'html');
app.use(compression());
app.use(logger('dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
        url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
        autoReconnect: true
    })
}));
passportConfig.verifyFbToken();
passportConfig.localAuth();
passportConfig.localLogin();
passportConfig.verifyJWT();
nodemailerConfig.mailerInit();
app.use(passport.initialize());
app.use(flash());
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    }
    else if (req.user &&
        req.path == '/account') {
        req.session.returnTo = req.path;
    }
    next();
});
app.use(express.static('public', { maxAge: 31557600000 }));
/**
 * Allow cross origin requests for swagger
 */
const corsOptions = {
    origin: 'http://127.0.0.1:59074',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
/**
 * Primary app routes.
 */
// DEBTS
app.get('/debts', passport.authenticate('jwt', { session: false }), debtsController.getAllUserDebts);
app.put('/debts', passport.authenticate('jwt', { session: false }), debtsController.createNewDebt);
app.get('/debts/:id', passport.authenticate('jwt', { session: false }), debtsController.getDebtsById);
app.post('/debts/:id/creation', passport.authenticate('jwt', { session: false }), debtsController.acceptCreation);
app.delete('/debts/:id/creation', passport.authenticate('jwt', { session: false }), debtsController.declineCreation);
app.put('/debts/:id/delete_request', passport.authenticate('jwt', { session: false }), debtsController.requestDebtsDelete);
app.delete('/debts/:id/delete_request', passport.authenticate('jwt', { session: false }), debtsController.requestDebtsDeleteAccept);
app.post('/debts/:id/delete_request', passport.authenticate('jwt', { session: false }), debtsController.requestDebtsDeleteDecline);
app.put('/debts/single', passport.authenticate('jwt', { session: false }), debtsController.createSingleDebt);
app.delete('/debts/single/:id', passport.authenticate('jwt', { session: false }), debtsController.deleteSingleDebt);
// MONEY OPERATIONS
app.put('/operation', passport.authenticate('jwt', { session: false }), operationsController.createOperation);
app.delete('/operation/:id', passport.authenticate('jwt', { session: false }), operationsController.deleteOperation);
app.post('/operation/:id/creation', passport.authenticate('jwt', { session: false }), operationsController.acceptOperation);
app.delete('/operation/:id/creation', passport.authenticate('jwt', { session: false }), operationsController.declineOperation);
// USERS
app.get('/users', passport.authenticate('jwt', { session: false }), usersController.getUsersArrayByName);
app.patch('/users', passport.authenticate('jwt', { session: false }), usersController.uploadImage, usersController.updateUserData);
/**
 * AUTH
 */
app.put('/signup/local', authController.localSignUp);
app.post('/login/local', authController.localLogin);
app.get('/login/facebook', authController.facebookLogin);
app.get('/login_status', passport.authenticate('jwt', { session: false }), authController.checkLoginStatus);
// Need nodemailer
// app.post('/reset-password', authController.resetPasswordSendEmail);
/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(rollbar_1.rollbar.errorHandler());
module.exports = app;
//# sourceMappingURL=app.js.map