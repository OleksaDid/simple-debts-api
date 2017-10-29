/**
 * Setup environment first of all
 */
import * as dotenv from 'dotenv';

if(!process.env.ENVIRONMENT) {
    dotenv.config({ path: __dirname + '/config/.env.example' });
}


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
import * as mongo from 'connect-mongo';
import * as flash from 'express-flash';
import * as path from 'path';
import * as mongoose from 'mongoose';
import * as passport from 'passport';
import expressValidator = require('express-validator');
import * as cors from 'cors';
import errorHandler = require('errorhandler');
import { rollbar } from "./api/helpers/rollbar";

/**
 * Controllers (route handlers).
 */
import { AuthController } from './api/controllers/auth';
import { UsersController } from './api/controllers/users';
import { DebtsController } from './api/controllers/debts';
import { OperationsController } from './api/controllers/moneyOperation';
import { ErrorHandler } from "./api/helpers/error-handler";



export class App {
    private MongoStore = mongo(session);
    private errHandler = new ErrorHandler();

    private authController = new AuthController();
    private usersController = new UsersController();
    private debtsController = new DebtsController();
    private operationsController = new OperationsController();

    private app = express();


    constructor() {
        this.setupMongoConnection();
        this.expressConfig();
        this.allowCORS();
        this.setupRoutes();
        this.setupErrorHandler();
    }



    get application() {
        return this.app;
    }



    private setupMongoConnection(): void {
        const mongoServer = process.env.ENVIRONMENT === 'LOCAL' ? process.env.MONGODB_URI : process.env.MONGOLAB_URI;

        mongoose.Promise = global.Promise;
        mongoose.connect(mongoServer);

        mongoose.connection.on('error', () => {
            this.errHandler.sendError('MongoDB connection error. Please make sure MongoDB is running.');
            process.exit();
        });
    }

    private expressConfig(): void {
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
        this.app.use((req: any, res, next) => {
            res.locals.user = req.user;
            next();
        });
        this.app.use(express.static('public', { maxAge: 31557600000 }));
    }

    private allowCORS(): void {
        const corsOptions = {
            origin: 'http://127.0.0.1:59074',
            optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
        };

        this.app.use(cors(corsOptions));
    }

    private setupRoutes(): void {
        const v1 = this.getV1Routes(express.Router());

        this.app.use('/v1', v1);
        this.app.use('/', v1); // Set the default version to latest.
    }

    private getV1Routes(v1) {

        // DEBTS
        v1.get('/debts', this.authController.checkJWTAccess, this.debtsController.getAllUserDebts);
        v1.put('/debts', this.authController.checkJWTAccess, this.debtsController.createNewDebt);

        v1.get('/debts/:id', this.authController.checkJWTAccess, this.debtsController.getDebtsById);

        v1.post('/debts/:id/creation', this.authController.checkJWTAccess, this.debtsController.acceptCreation);
        v1.delete('/debts/:id/creation', this.authController.checkJWTAccess, this.debtsController.declineCreation);

        v1.put('/debts/:id/delete_request', this.authController.checkJWTAccess, this.debtsController.requestDebtsDelete);
        v1.delete('/debts/:id/delete_request', this.authController.checkJWTAccess, this.debtsController.requestDebtsDeleteAccept);
        v1.post('/debts/:id/delete_request', this.authController.checkJWTAccess, this.debtsController.requestDebtsDeleteDecline);

        v1.put('/debts/single', this.authController.checkJWTAccess, this.debtsController.createSingleDebt);
        v1.delete('/debts/single/:id', this.authController.checkJWTAccess, this.debtsController.deleteSingleDebt);

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

    private setupErrorHandler(): void {
        const handler = process.env.ENVIRONMENT === 'LOCAL' ?  errorHandler() : rollbar.errorHandler();
        this.app.use(handler);
    }

}