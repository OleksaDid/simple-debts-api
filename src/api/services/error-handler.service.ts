import errorHandler = require('errorhandler');
import * as Rollbar from 'rollbar';
import { Request, Response } from 'express';

export class ErrorHandler {


    private rollbar = new Rollbar(process.env.ROLLBAR_KEY);

    getHandler = () => {
        return process.env.ENVIRONMENT === 'LOCAL' ?  errorHandler() : this.rollbar['errorHandler']();
    };

    errorHandler = (req: Request, res: Response, err) => {
        this.sendError(err, req);

        return res.status(400).json({error: err});
    };

    sendError = (err, req?: Request) => {
        if(process.env.ENVIRONMENT !== 'LOCAL') {
            this.rollbar.error(JSON.stringify(err), req);
        } else {
            console.log(err);
        }
    };
}