"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const check_jwt_middleware_1 = require("../middleware/check-jwt.middleware");
const upload_image_middleware_1 = require("../middleware/upload-image.middleware");
const debts_controller_1 = require("./debts/debts.controller");
const operations_controller_1 = require("./operations/operations.controller");
const users_controller_1 = require("./users/users.controller");
const authentication_controller_1 = require("./authentication/authentication.controller");
class RoutesModule {
    constructor() {
        this.debtsController = new debts_controller_1.DebtsController();
        this.operationsController = new operations_controller_1.OperationsController();
        this.usersController = new users_controller_1.UsersController();
        this.authController = new authentication_controller_1.AuthController();
    }
    getV1Routes(router) {
        // DEBTS
        router.get('/debts', check_jwt_middleware_1.default, this.debtsController.getAllUserDebts);
        router.get('/debts/:id', check_jwt_middleware_1.default, this.debtsController.getDebtsById);
        router.delete('/debts/:id', check_jwt_middleware_1.default, this.debtsController.deleteDebt);
        router.put('/debts/multiple', check_jwt_middleware_1.default, this.debtsController.createNewDebt);
        router.post('/debts/multiple/:id/creation', check_jwt_middleware_1.default, this.debtsController.acceptCreation);
        router.delete('/debts/multiple/:id/creation', check_jwt_middleware_1.default, this.debtsController.declineCreation);
        router.put('/debts/single', check_jwt_middleware_1.default, this.debtsController.createSingleDebt);
        router.put('/debts/single/:id/connect_user', check_jwt_middleware_1.default, this.debtsController.connectUserToSingleDebt);
        router.post('/debts/single/:id/connect_user', check_jwt_middleware_1.default, this.debtsController.acceptUserConnection);
        router.delete('/debts/single/:id/connect_user', check_jwt_middleware_1.default, this.debtsController.declineUserConnection);
        router.post('/debts/single/:id/i_love_lsd', check_jwt_middleware_1.default, this.debtsController.acceptUserDeletedStatus);
        // MONEY OPERATIONS
        router.put('/operation', check_jwt_middleware_1.default, this.operationsController.createOperation);
        router.delete('/operation/:id', check_jwt_middleware_1.default, this.operationsController.deleteOperation);
        router.post('/operation/:id/creation', check_jwt_middleware_1.default, this.operationsController.acceptOperation);
        router.delete('/operation/:id/creation', check_jwt_middleware_1.default, this.operationsController.declineOperation);
        // USERS
        router.get('/users', check_jwt_middleware_1.default, this.usersController.getUsersArrayByName);
        router.patch('/users', check_jwt_middleware_1.default, upload_image_middleware_1.default, this.usersController.updateUserData);
        // AUTH
        router.put('/signup/local', this.authController.localSignUp);
        router.post('/login/local', this.authController.localLogin);
        router.get('/login/facebook', this.authController.facebookLogin);
        router.get('/login_status', check_jwt_middleware_1.default, this.authController.checkLoginStatus);
        router.get('/refresh_token', this.authController.refreshToken);
        return router;
    }
}
exports.RoutesModule = RoutesModule;
//# sourceMappingURL=routes.module.js.map