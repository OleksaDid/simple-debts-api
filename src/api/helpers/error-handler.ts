import {rollbar} from "./rollbar";

// TODO: make static methods to not to create new class instance per each controller

export class ErrorHandler {

    errorHandler = (req, res, err) => {
        res.statusCode = 400;

        this.sendError(err, req);

        return res.json({error: err});
    };

    sendError = (err, req?) => {
        if(process.env.ENVIRONMENT !== 'LOCAL') {
            rollbar.error(JSON.stringify(err), req);
        } else {
            console.log(err);
        }
    }
}