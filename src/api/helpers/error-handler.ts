import {rollbar} from "./rollbar";

export let errorHandler = (req, res, err) => {
        res.statusCode = 400;
        if(process.env.ENVIRONMENT !== 'LOCAL') {
            rollbar.error(JSON.stringify(err), req);
        } else {
            console.log(err);
        }
        return res.json({error: err});
};