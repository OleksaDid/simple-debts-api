import { Router } from 'express';
import checkJWTAccess from '../middleware/check-jwt.middleware';
import uploadImage from '../middleware/upload-image.middleware';
import { DebtsController } from './debts/debts.controller';
import { OperationsController } from './operations/operations.controller';
import { UsersController } from './users/users.controller';
import { AuthController } from './authentication/authentication.controller';


export class RoutesModule {

    private debtsController = new DebtsController();
    private operationsController = new OperationsController();
    private usersController = new UsersController();
    private authController = new AuthController();
    
    public getV1Routes(router: Router) {

        // DEBTS
        router.get('/debts', checkJWTAccess, this.debtsController.getAllUserDebts);
        router.put('/debts', checkJWTAccess, this.debtsController.createNewDebt);

        router.get('/debts/:id', checkJWTAccess, this.debtsController.getDebtsById);
        router.delete('/debts/:id', checkJWTAccess, this.debtsController.deleteDebt);

        router.post('/debts/:id/creation', checkJWTAccess, this.debtsController.acceptCreation);
        router.delete('/debts/:id/creation', checkJWTAccess, this.debtsController.declineCreation);


        router.put('/debts/single', checkJWTAccess, this.debtsController.createSingleDebt);

        router.put('/debts/single/:id/connect_user', checkJWTAccess, this.debtsController.connectUserToSingleDebt);
        router.post('/debts/single/:id/connect_user', checkJWTAccess, this.debtsController.acceptUserConnection);
        router.delete('/debts/single/:id/connect_user', checkJWTAccess, this.debtsController.declineUserConnection);

        router.post('/debts/single/:id/i_love_lsd', checkJWTAccess, this.debtsController.acceptUserDeletedStatus);

        // MONEY OPERATIONS
        router.put('/operation', checkJWTAccess, this.operationsController.createOperation);

        router.delete('/operation/:id', checkJWTAccess, this.operationsController.deleteOperation);

        router.post('/operation/:id/creation', checkJWTAccess, this.operationsController.acceptOperation);
        router.delete('/operation/:id/creation', checkJWTAccess, this.operationsController.declineOperation);

        // USERS
        router.get('/users', checkJWTAccess, this.usersController.getUsersArrayByName);
        router.patch('/users', checkJWTAccess, uploadImage, this.usersController.updateUserData);

        // AUTH
        router.put('/signup/local', this.authController.localSignUp);

        router.post('/login/local', this.authController.localLogin);
        router.get('/login/facebook', this.authController.facebookLogin);

        router.get('/login_status', checkJWTAccess, this.authController.checkLoginStatus);

        return router;
    }
}