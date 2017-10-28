/**
 * Module dependencies.
 */
import * as express from 'express';
import * as compression from 'compression';  // compresses requests
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as logger from 'morgan';
import * as lusca from 'lusca';
import * as dotenv from 'dotenv';
import * as mongo from 'connect-mongo';
import * as flash from 'express-flash';
import * as path from 'path';
import * as mongoose from 'mongoose';
import * as passport from 'passport';
import * as nodemailerConfig from './api/helpers/nodemailer';
import expressValidator = require('express-validator');
import * as cors from 'cors';

const MongoStore = mongo(session);

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
if(!process.env.ENVIRONMENT) {
    dotenv.config({ path: __dirname + '/config/.env.example' });
}


/**
 * Controllers (route handlers).
 */
import * as authController from './api/controllers/auth';
import * as usersController from './api/controllers/users';
import * as debtsController from './api/controllers/debts';
import * as operationsController from './api/controllers/moneyOperation';

/**
 * API keys and Passport configuration.
 */
import * as passportConfig from './api/helpers/passport';
import {rollbar} from "./api/helpers/rollbar";
import errorHandler = require("errorhandler");

/**
 * Create Express server.
 */
const app = express();

/**
 * Create API versions
 */
const v1 = express.Router();

app.use('/v1', v1);

app.use('/', v1); // Set the default version to latest.

/**
 * Swagger config
 */
module.exports = app; // for testing

/**
 * Connect to MongoDB.
 */
// mongoose.Promise = global.Promise;
mongoose.connect(process.env.ENVIRONMENT === 'LOCAL' ? process.env.MONGODB_URI : process.env.MONGOLAB_URI);

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
app.use((req: any, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req: any, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user &&
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
v1.get('/debts', passport.authenticate('jwt', { session: false }), debtsController.getAllUserDebts);
v1.put('/debts', passport.authenticate('jwt', { session: false }), debtsController.createNewDebt);

v1.get('/debts/:id', passport.authenticate('jwt', { session: false }), debtsController.getDebtsById);

v1.post('/debts/:id/creation', passport.authenticate('jwt', { session: false }), debtsController.acceptCreation);
v1.delete('/debts/:id/creation', passport.authenticate('jwt', { session: false }), debtsController.declineCreation);

v1.put('/debts/:id/delete_request', passport.authenticate('jwt', { session: false }), debtsController.requestDebtsDelete);
v1.delete('/debts/:id/delete_request', passport.authenticate('jwt', { session: false }), debtsController.requestDebtsDeleteAccept);
v1.post('/debts/:id/delete_request', passport.authenticate('jwt', { session: false }), debtsController.requestDebtsDeleteDecline);

v1.put('/debts/single', passport.authenticate('jwt', { session: false }), debtsController.createSingleDebt);
v1.delete('/debts/single/:id', passport.authenticate('jwt', { session: false }), debtsController.deleteSingleDebt);

// MONEY OPERATIONS
v1.put('/operation', passport.authenticate('jwt', { session: false }), operationsController.createOperation);

v1.delete('/operation/:id', passport.authenticate('jwt', { session: false }), operationsController.deleteOperation);

v1.post('/operation/:id/creation', passport.authenticate('jwt', { session: false }), operationsController.acceptOperation);
v1.delete('/operation/:id/creation', passport.authenticate('jwt', { session: false }), operationsController.declineOperation);

// USERS
v1.get('/users', passport.authenticate('jwt', { session: false }), usersController.getUsersArrayByName);
v1.patch('/users', passport.authenticate('jwt', { session: false }), usersController.uploadImage, usersController.updateUserData);

/**
 * AUTH
 */
v1.put('/signup/local', authController.localSignUp);

v1.post('/login/local', authController.localLogin);
v1.get('/login/facebook', authController.facebookLogin);

v1.get('/login_status', passport.authenticate('jwt', { session: false }), authController.checkLoginStatus);

// Need nodemailer
// app.post('/reset-password', authController.resetPasswordSendEmail);


/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(process.env.ENVIRONMENT === 'LOCAL' ?  errorHandler() : rollbar.errorHandler());

module.exports = app;