"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const SwaggerExpress = require("swagger-express-mw");
const app = new app_1.App().application;
const config = {
    appRoot: __dirname // required config
};
SwaggerExpress.create(config, function (err, swaggerExpress) {
    if (err) {
        throw err;
    }
    // install middleware
    swaggerExpress.register(app);
    const port = process.env.PORT || 10010;
    app.listen(port);
});
//# sourceMappingURL=server.js.map