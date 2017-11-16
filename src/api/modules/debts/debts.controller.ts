import { Response, Request } from 'express';
import * as fs from 'fs';
import User from '../users/user.schema';
import Debts from './debt.schema';
import { UserInterface } from '../users/user.interface';
import { DebtInterface, DebtsAccountType, DebtsStatus } from './debt.interface';
import { DebtDto } from './debt.dto';
import { CreateVirtualUserDto } from '../users/user.dto';
import { getImagesPath } from '../../services/get-images-path.service';
import Operation from '../operations/operation.schema';
import { OperationInterface, OperationStatus } from '../operations/operation.interface';
import { ErrorHandler } from '../../services/error-handler.service';
import { IMAGES_FOLDER_FILE_PATTERN } from '../../common/constants';
import { DebtsService } from './debts.service';



export class DebtsController {

    private errorHandler = new ErrorHandler();
    private debtsService = new DebtsService();


    /*
     * PUT
     * /debts
     * @param userId Id Id of the user you want to create a common Debts with
     * @param countryCode String ISO2 country code
     */
    createNewDebt = (req: Request, res: Response) => {
        req.assert('userId', 'User Id is not valid').isMongoId();
        req.assert('countryCode', 'Country code is empty').notEmpty();
        req.assert('countryCode', 'Country code length must be 2').isLength({min: 2, max: 2});
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const userId = req['swagger'] ? req['swagger'].params.userId.value : req.body.userId;
        const countryCode = req['swagger'] ? req['swagger'].params.countryCode.value : req.body.countryCode;
        const creatorId = req['user'].id;

        if(userId == creatorId) {
            return this.errorHandler.responseError(req, res, 'You cannot create Debts with yourself');
        }

        return User
            .findById(userId)
            .exec()
            .then((user: UserInterface) => {
                if(!user) {
                    throw new Error('User is not found');
                }

                return Debts
                    .findOne({'users': {'$all': [userId, creatorId]}})
                    .exec();
            })
            .then((debts: DebtInterface) => {
                if(debts) {
                    throw new Error('Such debts object is already created');
                }

                const newDebts = new DebtDto(creatorId, userId, DebtsAccountType.MULTIPLE_USERS, countryCode);

                return Debts.create(newDebts);
            })
            .then((debt: DebtInterface) => this.debtsService.getDebtsById(req, res, debt._id))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
     * PUT
     * /debts/single
     * @param userName String Name of virtual user
     * @param countryCode String ISO2 country code
     */
    createSingleDebt = (req: Request, res: Response) => {
        req.assert('userName', 'User Name is not valid').notEmpty();
        req.assert('userName', 'User Name is too long (30 characters max)').isLength({min: 1, max: 30});
        req.assert('countryCode', 'Country code is empty').notEmpty();
        req.assert('countryCode', 'Country code length must be 2').isLength({min: 2, max: 2});
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const userName = req['swagger'] ? req['swagger'].params.userName.value : req.body.userName;
        const countryCode = req['swagger'] ? req['swagger'].params.countryCode.value : req.body.countryCode;
        const creatorId = req['user'].id;

        const virtUser = new CreateVirtualUserDto(userName);

        return Debts
            .find({'users': {'$all': [creatorId]}, 'type': DebtsAccountType.SINGLE_USER})
            .populate({ path: 'users', select: 'name virtual'})
            .lean()
            .then((debts: DebtInterface[]) => {
                if(
                    debts &&
                    debts.length > 0 &&
                    debts.some(debt => !!debt.users.find(user => user['name'] === userName && user['virtual']))
                ) {
                    throw new Error('You already have virtual user with such name');
                }

                return User.create(virtUser);
            })
            .then((user: UserInterface) => {

                const newUser: any = new User();

                return newUser.generateIdenticon(user.id)
                    .then(image => {
                        user.picture = getImagesPath(req) + image;
                        return user.save();
                    })
                    .then(() => Debts.create(new DebtDto(creatorId, user._id, DebtsAccountType.SINGLE_USER, countryCode)));
            })
            .then(debt => this.debtsService.getDebtsById(req, res, debt._id))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };


    /*
    * DELETE
    * /debts/:id
    * @param id Id Debts Id
    */
    deleteDebt = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const userId = req['user'].id;

        return Debts
            .findOne({_id: debtsId, users: {$in: [userId]}})
            .populate({ path: 'users', select: 'name picture'})
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debts not found');
                }

                if(debt.type === DebtsAccountType.SINGLE_USER) {
                    return this.debtsService.deleteSingleDebt(req, res, debt, userId);
                } else if(debt.type === DebtsAccountType.MULTIPLE_USERS) {
                    return this.debtsService.deleteMultipleDebts(req, res, debt, userId);
                }
            })
            .catch(err => this.errorHandler.responseError(req, res, err));
    };
    

    /*
     * POST
     * /debts/creation
     * @param debtsId Id Id of debts you want to accept
     */
    acceptCreation = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const userId = req['user'].id;

        return Debts
            .findOneAndUpdate(
                { _id: debtsId, status: DebtsStatus.CREATION_AWAITING, statusAcceptor: userId },
                { status: DebtsStatus.UNCHANGED, statusAcceptor: null }
            )
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debts not found');
                }

                return this.debtsService.getAllUserDebts(req, res);
            })
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
     * DELETE
     * /debts/creation
     * @param debtsId Id Id of debts you want to decline
     */
    declineCreation = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const userId = req['user'].id;

        return Debts
            .findOneAndRemove({ _id: debtsId, status: DebtsStatus.CREATION_AWAITING, users: {$in: [userId]} })
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debts not found');
                }

                return this.debtsService.getAllUserDebts(req, res);
            })
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
     * GET
     * /debts
     */
    getAllUserDebts = (req: Request, res: Response) => {
        return this.debtsService
            .getAllUserDebts(req, res)
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
    * GET
    * /debts/:id
    */
    getDebtsById = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        return this.debtsService
            .getDebtsById(req, res)
            .catch(err => this.errorHandler.responseError(req, res, err));
    };


    /*
    * POST /debts/single/:id/i_love_lsd
    * Changes Debts status from USER_DELETED to UNCHANGED
    */
    acceptUserDeletedStatus = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const userId = req['user'].id;

        return Debts
            .findOne({
                _id: debtsId, 
                type: DebtsAccountType.SINGLE_USER, 
                status: DebtsStatus.USER_DELETED, 
                statusAcceptor: userId
            })
            .populate({
                path: 'moneyOperations',
                select: 'status'
            })
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debt is not found');
                }

                if(!debt.moneyOperations ||
                    !debt.moneyOperations.length ||
                    debt.moneyOperations.every(operation => operation.status === OperationStatus.UNCHANGED)
                ) {
                    debt.status = DebtsStatus.UNCHANGED;
                    debt.statusAcceptor = null;
                } else {
                    debt.status = DebtsStatus.CHANGE_AWAITING;
                    debt.statusAcceptor = userId;
                }

                return debt.save();
            })
            .then(() => this.debtsService.getDebtsById(req, res, debtsId))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
    * PUT /debts/single/:id/connect_user
    * Request user to join single_user Debt instead of bot
    * @param userId Id Id of user you want to invite
    * @query id Id Id of single_user Debt
    */
    connectUserToSingleDebt = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        req.assert('userId', 'User Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const anotherUserId = req['swagger'] ? req['swagger'].params.userId.value : req.body.userId;
        const userId = req['user'].id;

        if(userId.toString() === anotherUserId.toString()) {
            return this.errorHandler.responseError(req, res, 'You can\'t connect yourself');
        }

        return Debts
            .find({users: {$all: [userId, anotherUserId]}})
            .lean()
            .then((debts: DebtInterface[]) => {
                if(debts && debts['length'] > 0) {
                    throw new Error('You already have Debt with this user');
                }

                return Debts
                    .findOne({_id: debtsId, type: DebtsAccountType.SINGLE_USER, users: {$in: [userId]}});
            })
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debt is not found');
                }

                if(debt.status === DebtsStatus.CONNECT_USER) {
                    throw new Error('Some user is already waiting for connection to this Debt');
                }

                if(debt.status === DebtsStatus.USER_DELETED) {
                    throw new Error('You can\'t connect user to this Debt until you resolve user deletion');
                }

                debt.status = DebtsStatus.CONNECT_USER;
                debt.statusAcceptor = anotherUserId;

                return debt.save();
            })
            .then(() => this.debtsService.getDebtsById(req, res, debtsId))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
    * POST /debts/single/:id/connect_user
    * Accept connection invite
    * @query id Id Id of single_user Debt
    */
    acceptUserConnection = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const userId = req['user'].id;

        return Debts
            .findOne({
                _id: debtsId, 
                type: DebtsAccountType.SINGLE_USER, 
                status: DebtsStatus.CONNECT_USER, 
                statusAcceptor: userId
            })
            .populate('users', 'virtual')
            .then((debt: DebtInterface) => {
                const virtualUserId = debt.users.find(user => user['virtual']);

                debt.status = DebtsStatus.UNCHANGED;
                debt.type = DebtsAccountType.MULTIPLE_USERS;
                debt.statusAcceptor = null;

                if(debt.moneyReceiver === virtualUserId) {
                    debt.moneyReceiver = userId;
                }

                debt.users.push(userId);

                const promises = [];

                debt.moneyOperations.forEach(operation => {
                    promises.push(
                        Operation.findById(operation)
                            .then((op: OperationInterface) => {
                                if(op.moneyReceiver === virtualUserId) {
                                    op.moneyReceiver = userId;
                                }

                                return op.save();
                            })
                    );
                });

                promises.push(
                    User.findByIdAndRemove(virtualUserId)
                        .then((user: UserInterface) => {
                            if(!user) {
                                throw new Error('Virtual user is not found');
                            }

                            const imageName = user.picture.match(IMAGES_FOLDER_FILE_PATTERN);

                            fs.unlinkSync('public' + imageName);
                        })
                );

                promises.push(
                    Debts.findByIdAndUpdate(debtsId, {
                        $pull: {users: virtualUserId}
                    })
                );

                return debt.save().then(() => Promise.all(promises));
            })
            .then(() => this.debtsService.getDebtsById(req, res, debtsId))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
    * DELETE /debts/single/:id/connect_user
    * Decline connection invite
    * @query id Id Id of single_user Debt
    */
    declineUserConnection = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const userId = req['user'].id;

        return Debts
            .findOneAndUpdate(
                {
                    _id: debtsId,
                    type: DebtsAccountType.SINGLE_USER,
                    status: DebtsStatus.CONNECT_USER,
                    $or: [
                        {users: {$in: [userId]}},
                        {statusAcceptor: userId}
                    ]
                },
                {status: DebtsStatus.UNCHANGED, statusAcceptor: null})
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debt is not found');
                }
                return this.debtsService.getAllUserDebts(req, res);
            })
            .catch(err => this.errorHandler.responseError(req, res, err));
    };
    
}

