"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debts_1 = require("../models/Debts");
const User_1 = require("../models/User");
const fs = require("fs");
const static_1 = require("../helpers/static");
const error_handler_1 = require("../helpers/error-handler");
const MoneyOperation_1 = require("../models/MoneyOperation");
class DebtsController {
    constructor() {
        this.errorHandler = new error_handler_1.ErrorHandler();
        /*
         * PUT
         * /debts
         * @param userId Id Id of the user you want to create a common Debts with
         * @param countryCode String ISO2 country code
         */
        this.createNewDebt = (req, res) => {
            req.assert('userId', 'User Id is not valid').isMongoId();
            req.assert('countryCode', 'Country code is empty').notEmpty();
            req.assert('countryCode', 'Country code length must be 2').isLength({ min: 2, max: 2 });
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const userId = req.swagger ? req.swagger.params.userId.value : req.body.userId;
            const countryCode = req.swagger ? req.swagger.params.countryCode.value : req.body.countryCode;
            const creatorId = req.user.id;
            if (userId == creatorId) {
                return this.errorHandler.errorHandler(req, res, 'You cannot create Debts with yourself');
            }
            return User_1.default
                .findById(userId)
                .exec()
                .then((user) => Debts_1.default.findOne({ 'users': { '$all': [userId, creatorId] } }).exec())
                .then((debts) => {
                if (debts) {
                    throw 'Such debts object is already created';
                }
                const newDebts = new Debts_1.DebtsModelClass(creatorId, userId, 'MULTIPLE_USERS', countryCode);
                return Debts_1.default.create(newDebts);
            })
                .then((resp) => this.getDebtsByIdHelper(req, res, resp._id))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
         * PUT
         * /debts/single
         * @param userName String Name of virtual user
         * @param countryCode String ISO2 country code
         */
        this.createSingleDebt = (req, res) => {
            req.assert('userName', 'User Name is not valid').notEmpty();
            req.assert('countryCode', 'Country code is empty').notEmpty();
            req.assert('countryCode', 'Country code length must be 2').isLength({ min: 2, max: 2 });
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const userName = req.swagger ? req.swagger.params.userName.value : req.body.userName;
            const countryCode = req.swagger ? req.swagger.params.countryCode.value : req.body.countryCode;
            const creatorId = req.user.id;
            const virtUser = {
                name: userName,
                virtual: true
            };
            return Debts_1.default
                .find({ 'users': { '$all': [creatorId] }, 'type': 'SINGLE_USER' })
                .populate({ path: 'users', select: 'name virtual' })
                .lean()
                .then((resp) => {
                if (resp && resp.length > 0 && resp.some(debt => !!debt.users.find(us => us.name === userName && us.virtual))) {
                    throw 'You already have virtual user with such name';
                }
                return User_1.default.create(virtUser);
            })
                .then((user) => {
                const newUser = new User_1.default();
                return newUser.generateIdenticon(user.id)
                    .then(image => {
                    user.picture = static_1.StaticHelper.getImagesPath(req) + image;
                    return user.save();
                })
                    .then(() => Debts_1.default.create(new Debts_1.DebtsModelClass(creatorId, user._id, 'SINGLE_USER', countryCode)));
            })
                .then(debt => this.getDebtsByIdHelper(req, res, debt._id))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
         * DELETE
         * /debts/single
         * @param debtsId Id Id of Debts you want to delete
         */
        this.deleteSingleDebt = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
            const userId = req.user.id;
            return Debts_1.default
                .findOneAndRemove({ _id: debtsId, users: { $in: [userId] }, type: 'SINGLE_USER' })
                .then((resp) => {
                if (!resp) {
                    throw 'Debts not found';
                }
                const virtualUserId = resp.users.find(user => user.toString() != userId);
                return User_1.default.findByIdAndRemove(virtualUserId);
            })
                .then((user) => {
                if (!user) {
                    throw 'User not found';
                }
                const imageName = user.picture.match(/\/images\/.*/);
                fs.unlinkSync('public' + imageName);
                return this.getAllUserDebts(req, res);
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
         * POST
         * /debts/creation
         * @param debtsId Id Id of debts you want to accept
         */
        this.acceptCreation = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
            const userId = req.user.id;
            return Debts_1.default
                .findOneAndUpdate({ _id: debtsId, status: 'CREATION_AWAITING', statusAcceptor: userId }, { status: 'UNCHANGED', statusAcceptor: null })
                .then((resp) => {
                if (!resp) {
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
        this.declineCreation = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
            const userId = req.user.id;
            return Debts_1.default
                .findOneAndRemove({ _id: debtsId, status: 'CREATION_AWAITING', users: { $in: [userId] } })
                .then((resp) => {
                if (!resp) {
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
        this.getAllUserDebts = (req, res) => {
            const userId = req.user.id;
            return Debts_1.default
                .find({
                $or: [
                    { users: { '$all': [userId] } },
                    { status: 'CONNECT_USER', statusAcceptor: userId }
                ]
            })
                .populate({ path: 'users', select: 'name picture virtual' })
                .sort({ status: 1, updatedAt: -1 })
                .lean()
                .exec((err, debts) => {
                if (err) {
                    throw err;
                }
                if (debts) {
                    const debtsArray = debts.map(debt => this.formatDebt(debt, userId, false));
                    res.json(new Debts_1.DebtsListClass(debtsArray, userId));
                }
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
        * GET
        * /debts/:id
        */
        this.getDebtsById = (req, res) => {
            return this.getDebtsByIdHelper(req, res);
        };
        /*
        * DELETE
        * /debts/:id
        * Deletes user from MULTIPLE_USERS Debts entity
        */
        this.deleteMultipleDebts = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
            const userId = req.user.id;
            let deletedUserInfo;
            let createdVirtualUser;
            return Debts_1.default
                .findOne({ _id: debtsId, type: 'MULTIPLE_USERS', users: { $in: [userId] } })
                .populate({ path: 'users', select: 'name picture' })
                .lean()
                .then(debt => {
                if (!debt) {
                    throw 'Debt is not found';
                }
                deletedUserInfo = debt['users'].find(user => user._id.toString() === userId.toString());
                deletedUserInfo.name += ' BOT';
                deletedUserInfo.virtual = true;
                delete deletedUserInfo._id;
                return User_1.default.create(deletedUserInfo);
            })
                .then(user => {
                createdVirtualUser = user;
                return Debts_1.default.findByIdAndUpdate(debtsId, {
                    type: 'SINGLE_USER',
                    status: 'USER_DELETED',
                    $pull: { 'users': userId }
                });
            })
                .then(debt => {
                debt['statusAcceptor'] = debt['users'].find(user => user.toString() !== userId.toString());
                debt['users'].push(createdVirtualUser._id);
                const promises = [];
                debt['moneyOperations']
                    .forEach(operationId => promises.push(MoneyOperation_1.default.findById(operationId)));
                return debt
                    .save()
                    .then(() => Promise.all(promises));
            })
                .then(operations => {
                const promises = operations.map(operation => {
                    if (operation.moneyReceiver.toString() === userId.toString()) {
                        operation.moneyReceiver = createdVirtualUser._id;
                    }
                    if (operation.statusAcceptor.toString() === userId.toString()) {
                        operation.statusAcceptor = null;
                        operation.status = 'UNCHANGED';
                    }
                    return operation.save();
                });
                return Promise.all(promises);
            })
                .then(() => this.getAllUserDebts(req, res))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
        * POST /debts/single/:id/i_love_lsd
        * Changes Debts status from USER_DELETED to UNCHANGED
        */
        this.acceptUserDeletedStatus = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
            const userId = req.user.id;
            return Debts_1.default
                .findOne({ _id: debtsId, type: 'SINGLE_USER', status: 'USER_DELETED', statusAcceptor: userId })
                .populate({
                path: 'moneyOperations',
                select: 'status'
            })
                .then(debt => {
                if (!debt) {
                    throw 'Debt is not found';
                }
                if (!debt['moneyOperations'] ||
                    !debt['moneyOperations'].length ||
                    debt['moneyOperations'].every(operation => operation.status === 'UNCHANGED')) {
                    debt['status'] = 'UNCHANGED';
                    debt['statusAcceptor'] = null;
                }
                else {
                    debt['status'] = 'CHANGE_AWAITING';
                    debt['statusAcceptor'] = userId;
                }
                return debt.save();
            })
                .then(() => this.getDebtsByIdHelper(req, res, debtsId))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
        * PUT /debts/single/:id/connect_user
        * Request user to join single_user Debt instead of bot
        * @param userId Id Id of user you want to invite
        * @query id Id Id of single_user Debt
        */
        this.connectUserToSingleDebt = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            req.assert('userId', 'User Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
            const anotherUserId = req.swagger ? req.swagger.params.userId.value : req.body.userId;
            const userId = req.user.id;
            if (userId.toString() === anotherUserId.toString()) {
                return this.errorHandler.errorHandler(req, res, 'You can\'t connect yourself');
            }
            return Debts_1.default
                .find({ users: { $all: [userId, anotherUserId] } })
                .lean()
                .then(debts => {
                if (debts && debts['length'] > 0) {
                    throw 'You already have Debt with this user';
                }
                return Debts_1.default
                    .findOne({ _id: debtsId, type: 'SINGLE_USER', users: { $in: [userId] } });
            })
                .then(debt => {
                if (!debt) {
                    throw 'Debt is not found';
                }
                if (debt['status'] === 'CONNECT_USER') {
                    throw 'Some user is already waiting for connection to this Debt';
                }
                if (debt['status'] === 'USER_DELETED') {
                    throw 'You can\'t connect user to this Debt until you resolve user deletion';
                }
                debt['status'] = 'CONNECT_USER';
                debt['statusAcceptor'] = anotherUserId;
                return debt.save();
            })
                .then(() => this.getDebtsByIdHelper(req, res, debtsId))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
        * POST /debts/single/:id/connect_user
        * Accept connection invite
        * @query id Id Id of single_user Debt
        */
        this.acceptUserConnection = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
            const userId = req.user.id;
            return Debts_1.default
                .findOne({ _id: debtsId, type: 'SINGLE_USER', status: 'CONNECT_USER', statusAcceptor: userId })
                .populate('users', 'virtual')
                .then(debt => {
                const virtualUserId = debt['users'].find(user => user.virtual);
                debt['status'] = 'UNCHANGED';
                debt['type'] = 'MULTIPLE_USERS';
                debt['statusAcceptor'] = null;
                if (debt['moneyReceiver'] === virtualUserId) {
                    debt['moneyReceiver'] = userId;
                }
                debt['users'].push(userId);
                const promises = [];
                debt['moneyOperations'].forEach(operation => {
                    promises.push(MoneyOperation_1.default.findById(operation)
                        .then(op => {
                        if (op['moneyReceiver'] === virtualUserId) {
                            op['moneyReceiver'] = userId;
                        }
                        return op.save();
                    }));
                });
                promises.push(User_1.default.findByIdAndRemove(virtualUserId)
                    .then(user => {
                    if (!user) {
                        throw 'Virtual user is not found';
                    }
                    const imageName = user['picture'].match(/\/images\/.*/);
                    fs.unlinkSync('public' + imageName);
                }));
                promises.push(Debts_1.default.findByIdAndUpdate(debtsId, {
                    $pull: { users: virtualUserId }
                }));
                return debt.save().then(() => Promise.all(promises));
            })
                .then(() => this.getDebtsByIdHelper(req, res, debtsId))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
        * DELETE /debts/single/:id/connect_user
        * Decline connection invite
        * @query id Id Id of single_user Debt
        */
        this.declineUserConnection = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
            const userId = req.user.id;
            return Debts_1.default
                .findOneAndUpdate({
                _id: debtsId,
                type: 'SINGLE_USER',
                status: 'CONNECT_USER',
                $or: [
                    { users: { $in: [userId] } },
                    { statusAcceptor: userId }
                ]
            }, { status: 'UNCHANGED', statusAcceptor: null })
                .then(debt => {
                if (!debt) {
                    throw 'Debt is not found';
                }
                this.getDebtsByIdHelper(req, res, debtsId);
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        this.getDebtsByIdHelper = (req, res, debts) => {
            const debtsId = debts ? debts : (req.swagger ? req.swagger.params.id.value : req.params.id);
            const userId = req.user.id;
            return Debts_1.default.findById(debtsId)
                .populate({
                path: 'moneyOperations',
                select: 'date moneyAmount moneyReceiver description status statusAcceptor',
                options: { sort: { 'date': -1 } }
            })
                .populate({ path: 'users', select: 'name picture virtual' })
                .lean()
                .exec((err, debt) => {
                if (err) {
                    return this.errorHandler.errorHandler(req, res, err);
                }
                if (!debt) {
                    return this.errorHandler.errorHandler(req, res, 'Debts with id ' + debtsId + ' is not found');
                }
                if (debt) {
                    res.json(this.formatDebt(debt, userId, true));
                }
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
    }
    formatDebt(debt, userId, saveOperations) {
        let newDebt = debt;
        // make preview for user connect
        if (debt.status === 'CONNECT_USER' && debt.statusAcceptor === userId) {
            const userToChange = newDebt.users.find(user => user.virtual);
            newDebt = JSON.parse(JSON.stringify(newDebt).replace(userToChange._id.toString(), userId.toString()));
        }
        newDebt.user = newDebt.users.find(user => user._id.toString() != userId);
        newDebt.user.id = newDebt.user._id;
        newDebt.id = debt._id;
        delete newDebt._id;
        delete newDebt.user._id;
        delete newDebt.user.virtual;
        delete newDebt.users;
        delete newDebt.__v;
        delete newDebt.createdAt;
        delete newDebt.updatedAt;
        if (saveOperations) {
            newDebt.moneyOperations.forEach(operation => {
                operation.id = operation._id;
                delete operation._id;
            });
        }
        else {
            delete newDebt.moneyOperations;
        }
        return newDebt;
    }
}
exports.DebtsController = DebtsController;
//# sourceMappingURL=debts.js.map