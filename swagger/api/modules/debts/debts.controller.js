"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const user_schema_1 = require("../users/user.schema");
const debt_schema_1 = require("./debt.schema");
const debt_interface_1 = require("./debt.interface");
const debt_dto_1 = require("./debt.dto");
const user_dto_1 = require("../users/user.dto");
const get_images_path_service_1 = require("../../services/get-images-path.service");
const operation_schema_1 = require("../operations/operation.schema");
const operation_interface_1 = require("../operations/operation.interface");
const error_handler_service_1 = require("../../services/error-handler.service");
const constants_1 = require("../../common/constants");
const debts_service_1 = require("./debts.service");
class DebtsController {
    constructor() {
        this.errorHandler = new error_handler_service_1.ErrorHandler();
        this.debtsService = new debts_service_1.DebtsService();
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
            const userId = req['swagger'] ? req['swagger'].params.userId.value : req.body.userId;
            const countryCode = req['swagger'] ? req['swagger'].params.countryCode.value : req.body.countryCode;
            const creatorId = req['user'].id;
            if (userId == creatorId) {
                return this.errorHandler.errorHandler(req, res, 'You cannot create Debts with yourself');
            }
            return user_schema_1.default
                .findById(userId)
                .exec()
                .then((user) => {
                if (!user) {
                    throw 'User is not found';
                }
                return debt_schema_1.default
                    .findOne({ 'users': { '$all': [userId, creatorId] } })
                    .exec();
            })
                .then((debts) => {
                if (debts) {
                    throw 'Such debts object is already created';
                }
                const newDebts = new debt_dto_1.DebtDto(creatorId, userId, debt_interface_1.DebtsAccountType.MULTIPLE_USERS, countryCode);
                return debt_schema_1.default.create(newDebts);
            })
                .then((debt) => this.debtsService.getDebtsById(req, res, debt._id))
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
            req.assert('userName', 'User Name is too long (30 characters max)').isLength({ min: 1, max: 30 });
            req.assert('countryCode', 'Country code is empty').notEmpty();
            req.assert('countryCode', 'Country code length must be 2').isLength({ min: 2, max: 2 });
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const userName = req['swagger'] ? req['swagger'].params.userName.value : req.body.userName;
            const countryCode = req['swagger'] ? req['swagger'].params.countryCode.value : req.body.countryCode;
            const creatorId = req['user'].id;
            const virtUser = new user_dto_1.CreateVirtualUserDto(userName);
            return debt_schema_1.default
                .find({ 'users': { '$all': [creatorId] }, 'type': debt_interface_1.DebtsAccountType.SINGLE_USER })
                .populate({ path: 'users', select: 'name virtual' })
                .lean()
                .then((debts) => {
                if (debts &&
                    debts.length > 0 &&
                    debts.some(debt => !!debt.users.find(user => user['name'] === userName && user['virtual']))) {
                    throw 'You already have virtual user with such name';
                }
                return user_schema_1.default.create(virtUser);
            })
                .then((user) => {
                const newUser = new user_schema_1.default();
                return newUser.generateIdenticon(user.id)
                    .then(image => {
                    user.picture = get_images_path_service_1.getImagesPath(req) + image;
                    return user.save();
                })
                    .then(() => debt_schema_1.default.create(new debt_dto_1.DebtDto(creatorId, user._id, debt_interface_1.DebtsAccountType.SINGLE_USER, countryCode)));
            })
                .then(debt => this.debtsService.getDebtsById(req, res, debt._id))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
        * DELETE
        * /debts/:id
        * @param id Id Debts Id
        */
        this.deleteDebt = (req, res) => {
            req.assert('id', 'Debts Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
            return debt_schema_1.default
                .findOne({ _id: debtsId, users: { $in: [userId] } })
                .populate({ path: 'users', select: 'name picture' })
                .then((debt) => {
                if (!debt) {
                    throw 'Debts not found';
                }
                if (debt.type === debt_interface_1.DebtsAccountType.SINGLE_USER) {
                    return this.debtsService.deleteSingleDebt(req, res, debt, userId);
                }
                else if (debt.type === debt_interface_1.DebtsAccountType.MULTIPLE_USERS) {
                    return this.debtsService.deleteMultipleDebts(req, res, debt, userId);
                }
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
            const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
            return debt_schema_1.default
                .findOneAndUpdate({ _id: debtsId, status: debt_interface_1.DebtsStatus.CREATION_AWAITING, statusAcceptor: userId }, { status: debt_interface_1.DebtsStatus.UNCHANGED, statusAcceptor: null })
                .then((debt) => {
                if (!debt) {
                    throw 'Debts not found';
                }
                return this.debtsService.getAllUserDebts(req, res);
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
            const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
            return debt_schema_1.default
                .findOneAndRemove({ _id: debtsId, status: debt_interface_1.DebtsStatus.CREATION_AWAITING, users: { $in: [userId] } })
                .then((debt) => {
                if (!debt) {
                    throw 'Debts not found';
                }
                return this.debtsService.getAllUserDebts(req, res);
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
         * GET
         * /debts
         */
        this.getAllUserDebts = (req, res) => {
            return this.debtsService.getAllUserDebts(req, res);
        };
        /*
        * GET
        * /debts/:id
        */
        this.getDebtsById = (req, res) => {
            return this.debtsService.getDebtsById(req, res);
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
            const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
            return debt_schema_1.default
                .findOne({
                _id: debtsId,
                type: debt_interface_1.DebtsAccountType.SINGLE_USER,
                status: debt_interface_1.DebtsStatus.USER_DELETED,
                statusAcceptor: userId
            })
                .populate({
                path: 'moneyOperations',
                select: 'status'
            })
                .then((debt) => {
                if (!debt) {
                    throw 'Debt is not found';
                }
                if (!debt.moneyOperations ||
                    !debt.moneyOperations.length ||
                    debt.moneyOperations.every(operation => operation.status === operation_interface_1.OperationStatus.UNCHANGED)) {
                    debt.status = debt_interface_1.DebtsStatus.UNCHANGED;
                    debt.statusAcceptor = null;
                }
                else {
                    debt.status = debt_interface_1.DebtsStatus.CHANGE_AWAITING;
                    debt.statusAcceptor = userId;
                }
                return debt.save();
            })
                .then(() => this.debtsService.getDebtsById(req, res, debtsId))
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
            const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const anotherUserId = req['swagger'] ? req['swagger'].params.userId.value : req.body.userId;
            const userId = req['user'].id;
            if (userId.toString() === anotherUserId.toString()) {
                return this.errorHandler.errorHandler(req, res, 'You can\'t connect yourself');
            }
            return debt_schema_1.default
                .find({ users: { $all: [userId, anotherUserId] } })
                .lean()
                .then((debts) => {
                if (debts && debts['length'] > 0) {
                    throw 'You already have Debt with this user';
                }
                return debt_schema_1.default
                    .findOne({ _id: debtsId, type: debt_interface_1.DebtsAccountType.SINGLE_USER, users: { $in: [userId] } });
            })
                .then((debt) => {
                if (!debt) {
                    throw 'Debt is not found';
                }
                if (debt.status === debt_interface_1.DebtsStatus.CONNECT_USER) {
                    throw 'Some user is already waiting for connection to this Debt';
                }
                if (debt.status === debt_interface_1.DebtsStatus.USER_DELETED) {
                    throw 'You can\'t connect user to this Debt until you resolve user deletion';
                }
                debt.status = debt_interface_1.DebtsStatus.CONNECT_USER;
                debt.statusAcceptor = anotherUserId;
                return debt.save();
            })
                .then(() => this.debtsService.getDebtsById(req, res, debtsId))
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
            const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
            return debt_schema_1.default
                .findOne({
                _id: debtsId,
                type: debt_interface_1.DebtsAccountType.SINGLE_USER,
                status: debt_interface_1.DebtsStatus.CONNECT_USER,
                statusAcceptor: userId
            })
                .populate('users', 'virtual')
                .then((debt) => {
                const virtualUserId = debt.users.find(user => user['virtual']);
                debt.status = debt_interface_1.DebtsStatus.UNCHANGED;
                debt.type = debt_interface_1.DebtsAccountType.MULTIPLE_USERS;
                debt.statusAcceptor = null;
                if (debt.moneyReceiver === virtualUserId) {
                    debt.moneyReceiver = userId;
                }
                debt.users.push(userId);
                const promises = [];
                debt.moneyOperations.forEach(operation => {
                    promises.push(operation_schema_1.default.findById(operation)
                        .then((op) => {
                        if (op.moneyReceiver === virtualUserId) {
                            op.moneyReceiver = userId;
                        }
                        return op.save();
                    }));
                });
                promises.push(user_schema_1.default.findByIdAndRemove(virtualUserId)
                    .then((user) => {
                    if (!user) {
                        throw 'Virtual user is not found';
                    }
                    const imageName = user.picture.match(constants_1.IMAGES_FOLDER_FILE_PATTERN);
                    fs.unlinkSync('public' + imageName);
                }));
                promises.push(debt_schema_1.default.findByIdAndUpdate(debtsId, {
                    $pull: { users: virtualUserId }
                }));
                return debt.save().then(() => Promise.all(promises));
            })
                .then(() => this.debtsService.getDebtsById(req, res, debtsId))
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
            const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
            return debt_schema_1.default
                .findOneAndUpdate({
                _id: debtsId,
                type: debt_interface_1.DebtsAccountType.SINGLE_USER,
                status: debt_interface_1.DebtsStatus.CONNECT_USER,
                $or: [
                    { users: { $in: [userId] } },
                    { statusAcceptor: userId }
                ]
            }, { status: debt_interface_1.DebtsStatus.UNCHANGED, statusAcceptor: null })
                .then((debt) => {
                if (!debt) {
                    throw 'Debt is not found';
                }
                return this.debtsService.getAllUserDebts(req, res);
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
    }
}
exports.DebtsController = DebtsController;
//# sourceMappingURL=debts.controller.js.map