import { Request, Response } from 'express';
import { UpdateUserDataDto } from './user.dto';
import { ErrorHandler } from '../../services/error-handler.service';
import { getImagesPath } from '../../services/get-images-path.service';
import { UsersService } from './users.service';


export class UsersController {

    private errorHandler = new ErrorHandler();
    private usersService = new UsersService();



    /*
     * GET
     * /users
     * @query name String String to search users by name
     */
    getUsersArrayByName = (req: Request, res: Response) => {
        req.assert('name', 'User name is empty').notEmpty();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const name = req['swagger'] ? req['swagger'].params.name.value : req.query.name;
        const userId = req['user'].id;

        this.usersService.getUsersByName(name, userId)
            .then(users => res.status(200).json(users))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };



    /*
     * POST
     * /users
     * @header Content-Type multipart/form-data
     * @param name String Name of user
     * @param image File User's avatar
     */
    updateUserData = (req: Request, res: Response) => {
        req.assert('name', 'Name field should not be empty').notEmpty();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const name = req['swagger'] ? req['swagger'].params.name.value : req.body.name;
        const userId = req['user'].id;
        const fileName = req['file'] && req['file'].filename ? req['file'].filename : null;

        const userInfo = new UpdateUserDataDto(
            name,
            fileName ? getImagesPath(req) + fileName : null
        );


        this.usersService
            .updateUserData(userId, userInfo)
            .then(users => res.status(200).json(users))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };
}
