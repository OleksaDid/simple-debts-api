import {rollbar} from "./rollbar";

export let errorHandler = (req, res, err) => {
        res.statusCode = 400;
        rollbar.error(JSON.stringify(err), req);
        return res.json({error: err});
};