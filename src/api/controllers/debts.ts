import { Response } from 'express';
import { DebtsListClass, DebtsModel, DebtsModelClass, default as Debts } from '../models/Debts';
import { default as User, UserModel } from '../models/User';
import { Id } from '../models/common';
import * as fs from 'fs';
import {StaticHelper} from "../helpers/static";
import {ErrorHandler} from "../helpers/error-handler";



export class DebtsController {

    private errorHandler = new ErrorHandler();


    /*
     * PUT
     * /debts
     * @param userId Id Id of the user you want to create a common Debts with
     * @param countryCode String ISO2 country code
     */
    createNewDebt = (req: any, res: Response) => {
        req.assert('userId', 'User Id is not valid').notEmpty();
        req.assert('countryCode', 'Country code is empty').notEmpty();
        req.assert('countryCode', 'Country code length must be 2').isLength({min: 2, max: 2});

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const userId = req.swagger ? req.swagger.params.userId.value : req.body.userId;
        const countryCode = req.swagger ? req.swagger.params.countryCode.value : req.body.countryCode;
        const creatorId = req.user.id;

        if(userId == creatorId) {
            return this.errorHandler.errorHandler(req, res, 'You cannot create Debts with yourself');
        }

        return User
            .findById(userId)
            .exec()
            .then((user: UserModel) => Debts.findOne({'users': {'$all': [userId, creatorId]}}).exec())
            .then((debts: DebtsModel) => {
                if(debts) {
                    throw 'Such debts object is already created';
                }

                const newDebts = new DebtsModelClass(creatorId, userId, 'MULTIPLE_USERS', countryCode);

                return Debts.create(newDebts);
            })
            .then((resp: DebtsModel) => this.getDebtsByIdHelper(req, res, resp._id))
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    /*
     * PUT
     * /debts/single
     * @param userName String Name of virtual user
     * @param countryCode String ISO2 country code
     */
    createSingleDebt = (req: any, res: Response) => {
        req.assert('userName', 'User Name is not valid').notEmpty();
        req.assert('countryCode', 'Country code is empty').notEmpty();
        req.assert('countryCode', 'Country code length must be 2').isLength({min: 2, max: 2});

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const userName = req.swagger ? req.swagger.params.userName.value : req.body.userName;
        const countryCode = req.swagger ? req.swagger.params.countryCode.value : req.body.countryCode;
        const creatorId = req.user.id;

        const virtUser = {
            name: userName
        };

        return Debts
            .find({'users': {'$all': [creatorId]}, 'type': 'SINGLE_USER'})
            .populate({ path: 'users', select: 'name'})
            .lean()
            .then((resp: any) => {
                if(resp && resp.length > 0 && resp.some(debt => !!debt.users.find(us => us.name === userName))) {
                    throw 'You already have virtual user with such name';
                }
                return User.create(virtUser);
            })
            .then((user: any) => {

                const newUser: any = new User();

                return newUser.generateIdenticon(user.id)
                    .then(image => {
                        user.picture = StaticHelper.getImagesPath(req) + image;
                        return user.save();
                    })
                    .then(() => Debts.create(new DebtsModelClass(creatorId, user._id, 'SINGLE_USER', countryCode)));
            })
            .then(debt => this.getDebtsByIdHelper(req, res, debt._id))
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    /*
     * DELETE
     * /debts/single
     * @param debtsId Id Id of Debts you want to delete
     */
    deleteSingleDebt = (req: any, res: Response) => {
        req.assert('id', 'Debts Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        return Debts
            .findOneAndRemove({_id: debtsId, users: {$in: [userId]}, type: 'SINGLE_USER'})
            .then((resp: any) => {
                if(!resp) {
                    throw 'Debts not found';
                }

                const virtualUserId = resp.users.find(user => user.toString() != userId);

                return User.findByIdAndRemove(virtualUserId);
            })
            .then((user: any) => {
                if(!user) {
                    throw 'User not found';
                }

                const imageName = user.picture.match(/\/images\/.*/);

                fs.unlink('public' + imageName);

                return this.getAllUserDebts(req, res);
            })
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    /*
     * POST
     * /debts/creation
     * @param debtsId Id Id of debts you want to accept
     */
    acceptCreation = (req: any, res: Response) => {
        req.assert('id', 'Debts Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        return Debts
            .findOneAndUpdate(
                { _id: debtsId, status: 'CREATION_AWAITING', statusAcceptor: userId },
                { status: 'UNCHANGED', statusAcceptor: null }
            )
            .then((resp: DebtsModel) => {
                if(!resp) {
                    throw 'Debts not found';
                }

                return this.getAllUserDebts(req, res);
            })
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    /*
     * DELETE
     * /debts/creation
     * @param debtsId Id Id of debts you want to decline
     */
    declineCreation = (req: any, res: Response) => {
        req.assert('id', 'Debts Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        return Debts
            .findOneAndRemove({ _id: debtsId, status: 'CREATION_AWAITING', users: {$in: [userId]} })
            .then((resp: DebtsModel) => {
                if(!resp) {
                    throw 'Debts not found';
                }

                return this.getAllUserDebts(req, res);
            })
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    /*
     * GET
     * /debts
     */
    getAllUserDebts = (req: any, res: Response) => {
        const userId = req.user.id;

        return Debts
            .find({'users': {'$all': [userId]}})
            .populate({ path: 'users', select: 'name picture'})
            .sort({status: 1, updatedAt: -1})
            .lean()
            .exec((err, debts: any) => {
                if(err) {
                    throw err;
                }

                if(debts) {
                    const debtsArray = debts.map(debt => this.formatDebt(debt, userId, false));

                    res.json(new DebtsListClass(debtsArray, userId));
                }
            })
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    /*
    * GET
    * /debts/:id
    */
    getDebtsById = (req: any, res: Response) => {
        return this.getDebtsByIdHelper(req, res);
    };

    /*
     * PUT
     * /debts/delete-request
     * @param debtsId Id Id of debts you want to delete
     */
    requestDebtsDelete = (req, res) => {
        req.assert('id', 'Debts Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        return Debts
            .findOne({ _id: debtsId, users: {'$all': [userId]} })
            .then((debts: any) => {

                if(debts.statusAcceptor !== null || debts.status !== 'UNCHANGED') {
                    throw 'Cannot modify debts that need acceptance';
                }

                debts.statusAcceptor = debts.users.find(user => user.toString() != userId);
                debts.status = 'DELETE_AWAITING';

                return debts.save();
            })
            .then(() => this.getAllUserDebts(req, res))
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };


    /*
     * DELETE
     * /debts/delete-request
     * @param debtsId Id Id of debts you want to accept delete
     */
    requestDebtsDeleteAccept = (req, res) => {
        req.assert('id', 'Debts Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        return Debts
            .findOneAndRemove({ _id: debtsId, status: 'DELETE_AWAITING', statusAcceptor: userId })
            .then((resp: DebtsModel) => {
                if(!resp) {
                    throw 'Debts not found';
                }

                return this.getAllUserDebts(req, res);
            })
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };


    /*
     * POST
     * /debts/delete-request
     * @param debtsId Id Id of debts you want to decline delete
     */
    requestDebtsDeleteDecline = (req, res) => {
        req.assert('id', 'Debts Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        return Debts
            .findOneAndUpdate(
                { _id: debtsId, status: 'DELETE_AWAITING', statusAcceptor: userId },
                {status: 'UNCHANGED', statusAcceptor: null}
            )
            .then((resp: DebtsModel) => {
                if(!resp) {
                    throw 'Debts not found';
                }

                return this.getAllUserDebts(req, res);
            })
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    getDebtsByIdHelper = (req, res, debts?: Id) => {
        const debtsId = debts ? debts : (req.swagger ? req.swagger.params.id.value : req.params.id);
        const userId = req.user.id;

        return Debts.findById(debtsId)
            .populate({
                path: 'moneyOperations',
                select: 'date moneyAmount moneyReceiver description status statusAcceptor',
                options: { sort: { 'date': -1 } }
            })
            .populate({ path: 'users', select: 'name picture'})
            .lean()
            .exec((err, debt: any) => {
                if(err) {
                    return this.errorHandler.errorHandler(req, res, err);
                }

                if(!debt) {
                    return this.errorHandler.errorHandler(req, res, 'Debts with id ' + debtsId + ' is not found');
                }

                if(debt) {
                    res.json(this.formatDebt(debt, userId, true));
                }
            })
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };



    private formatDebt(debt, userId, saveOperations: boolean) {
        const newDebt = debt;
        newDebt.user = newDebt.users.find(user => user._id.toString() != userId);
        newDebt.user.id = newDebt.user._id;
        newDebt.id = debt._id;
        delete newDebt._id;
        delete newDebt.user._id;
        delete newDebt.users;
        delete newDebt.__v;
        delete newDebt.createdAt;
        delete newDebt.updatedAt;

        if(saveOperations) {
            newDebt.moneyOperations.forEach(operation => {
                operation.id = operation._id;
                delete operation._id;
            });
        } else {
            delete newDebt.moneyOperations;
        }

        return newDebt;
    }
}

