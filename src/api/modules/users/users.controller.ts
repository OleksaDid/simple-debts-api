import { Request, Response } from 'express';
import User from './user.schema';
import { UserInterface } from './user.interface';
import { Id } from '../../common/types';
import { SendUserDto, UpdateUserDataDto } from './user.dto';
import { DebtInterface } from '../debts/debt.interface';
import Debts from '../debts/debt.schema';
import { ErrorHandler } from '../../services/error-handler.service';
import { getImagesPath } from '../../services/get-images-path.service';


export class UsersController {

    private errorHandler = new ErrorHandler();



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

        let usedUserIds: Id[];

        Debts
            .find({'users': {'$all': [userId]}})
            .populate({ path: 'users', select: 'name picture'})
            .exec()
            .then((debts: DebtInterface[]) => {
                usedUserIds = debts
                    .map(debt => debt.users.find(user => user['id'].toString() != userId)['id']);

                return User
                    .find({
                        'name': new RegExp(name, 'i'),
                        virtual: false
                    })
                    .limit(15)
                    .exec();
            })
            .then((users: UserInterface[]) => {
                const sendUsers = users
                    .filter(user => user.id != userId && !usedUserIds.find(id => user.id == id))
                    .map(user => new SendUserDto(user.id, user.name, user.picture));

                return res.status(200).json(sendUsers);
            })
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


        return User.findByIdAndUpdate(userId, userInfo)
            .then((updatedUser: UserInterface) => {
                if(!updatedUser) {
                    throw new Error('User not found');
                }

                const user = new SendUserDto(updatedUser.id, userInfo.name, userInfo.picture || updatedUser.picture);

                return res.status(200).json(user);
            })
            .catch(err => this.errorHandler.responseError(req, res, err));
    };
}