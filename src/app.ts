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
import { RoutesModule } from './api/modules/routes.module';
import { ErrorHandler } from './api/services/error-handler.service';




export class App {
    private MongoStore = mongo(session);
    private errHandler = new ErrorHandler();
    private routesModule = new RoutesModule();

    private app = express();


    constructor() {
        this.setupMongoConnection();
        this.expressConfig();

        this.setupRequestHandler();
        this.setupRoutes();
        this.setupErrorHandler();
    }



    get application() {
        return this.app;
    }



    private setupMongoConnection(): void {
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

    private setupRequestHandler(): void {
        this.app.use(this.errHandler.getRequestHandler());
    }

    private setupRoutes(): void {
        const v1 = this.routesModule.getV1Routes(express.Router());

        this.app.use('/v1', v1);
        this.app.use('/', v1); // Set the default version to latest.
    }

    private setupErrorHandler(): void {
        this.app.use(this.errHandler.getErrorHandler());
        this.app.use(this.errHandler.finalErrorHandler);
    }

}