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
import * as bodyParser from 'body-parser';
import * as logger from 'morgan';
import * as mongoose from 'mongoose';
import * as passport from 'passport';
import * as helmet from 'helmet';
import * as Ddos from 'ddos';
import expressValidator = require('express-validator');
import { RoutesModule } from './api/modules/routes.module';
import { ErrorHandler } from './api/services/error-handler.service';




export class App {
    private errHandler = new ErrorHandler();
    private routesModule = new RoutesModule();
    private ddos = new Ddos;

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

        this.app.use(compression());
        this.app.use(logger('dev'));

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        this.app.use(expressValidator());

        this.app.use(passport.initialize());

        this.app.use(express.static('public', { maxAge: 31557600000 }));

        this.securityConfig();
    }

    private securityConfig(): void {
        this.app.use(helmet());

        this.app.use(helmet.contentSecurityPolicy({
            directives: {
                defaultSrc: ["'self'"]
            }
        }));

        if(process.env.ENVIRONMENT !== 'LOCAL') {
            this.app.use(this.ddos.express);
        }
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