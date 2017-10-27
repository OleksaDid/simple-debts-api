import * as Rollbar from 'rollbar';

const rollbar = new Rollbar(process.env.ROLLBAR_KEY);

export {rollbar};

