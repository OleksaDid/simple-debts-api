"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debt_interface_1 = require("./debt.interface");
const user_schema_1 = require("../users/user.schema");
const user_dto_1 = require("../users/user.dto");
const debt_schema_1 = require("./debt.schema");
const operation_schema_1 = require("../operations/operation.schema");
const operation_interface_1 = require("../operations/operation.interface");
const constants_1 = require("../../common/constants");
const fs = require("fs");
const debt_dto_1 = require("./debt.dto");
const error_handler_service_1 = require("../../services/error-handler.service");
class DebtsService {
    constructor() {
        this.errorHandler = new error_handler_service_1.ErrorHandler();
        this.deleteMultipleDebts = (req, res, debt, userId) => {
            const deletedUserInfo = debt.users.find(user => user['_id'].toString() === userId.toString());
            let createdVirtualUser;
            return user_schema_1.default.create([
                new user_dto_1.CloneRealUserToVirtualDto(deletedUserInfo['name'], deletedUserInfo['picture'])
            ])
                .then((user) => {
                createdVirtualUser = user[0];
                return debt_schema_1.default.findByIdAndUpdate(debt.id, {
                    type: debt_interface_1.DebtsAccountType.SINGLE_USER,
                    status: debt_interface_1.DebtsStatus.USER_DELETED,
                    $pull: { 'users': userId }
                });
            })
                .then((debt) => {
                debt.statusAcceptor = debt.users.find(user => user.toString() !== userId.toString());
                debt.users.push(createdVirtualUser._id);
                const promises = [];
                debt['moneyOperations']
                    .forEach(operationId => promises.push(operation_schema_1.default.findById(operationId)));
                return debt
                    .save()
                    .then(() => Promise.all(promises));
            })
                .then((operations) => {
                const promises = operations.map(operation => {
                    if (operation.moneyReceiver.toString() === userId.toString()) {
                        operation.moneyReceiver = createdVirtualUser._id;
                    }
                    if (operation.statusAcceptor.toString() === userId.toString()) {
                        operation.statusAcceptor = null;
                        operation.status = operation_interface_1.OperationStatus.UNCHANGED;
                    }
                    return operation.save();
                });
                return Promise.all(promises);
            })
                .then(() => this.getAllUserDebts(req, res));
        };
        this.deleteSingleDebt = (req, res, debt, userId) => {
            const virtualUserId = debt.users.find(user => user['_id'].toString() != userId);
            return debt
                .remove()
                .then(() => user_schema_1.default.findByIdAndRemove(virtualUserId))
                .then((user) => {
                if (!user) {
                    throw 'User not found';
                }
                const imageName = user.picture.match(constants_1.IMAGES_FOLDER_FILE_PATTERN);
                fs.unlinkSync('public' + imageName);
                return this.getAllUserDebts(req, res);
            });
        };
        this.getAllUserDebts = (req, res) => {
            const userId = req['user'].id;
            return debt_schema_1.default
                .find({
                $or: [
                    { users: { '$all': [userId] } },
                    { status: debt_interface_1.DebtsStatus.CONNECT_USER, statusAcceptor: userId }
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
                    res.json(new debt_dto_1.DebtsListDto(debtsArray, userId));
                }
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        this.getDebtsById = (req, res, debts) => {
            if (!debts) {
                req.assert('id', 'Debts Id is not valid').isMongoId();
                const errors = req.validationErrors();
                if (errors) {
                    return this.errorHandler.errorHandler(req, res, errors);
                }
            }
            const debtsId = debts ? debts : (req['swagger'] ? req['swagger'].params.id.value : req.params.id);
            const userId = req['user'].id;
            return debt_schema_1.default
                .findById(debtsId)
                .populate({
                path: 'moneyOperations',
                select: 'date moneyAmount moneyReceiver description status statusAcceptor',
                options: { sort: { 'date': -1 } }
            })
                .populate({ path: 'users', select: 'name picture virtual' })
                .lean()
                .then((debt) => {
                if (!debt) {
                    throw 'Debts with id ' + debtsId + ' is not found';
                }
                res.json(this.formatDebt(debt, userId, true));
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
    }
    formatDebt(debt, userId, saveOperations) {
        let newDebt = debt;
        // make preview for user connect
        if (debt.status === debt_interface_1.DebtsStatus.CONNECT_USER && debt.statusAcceptor === userId) {
            const userToChange = newDebt.users.find(user => user['virtual']);
            newDebt = JSON.parse(JSON.stringify(newDebt).replace(userToChange['_id'].toString(), userId.toString()));
        }
        newDebt['user'] = newDebt.users.find(user => user['_id'].toString() != userId);
        newDebt['user'].id = newDebt['user']._id;
        newDebt.id = debt._id;
        delete newDebt._id;
        delete newDebt['user']._id;
        delete newDebt['user'].virtual;
        delete newDebt.users;
        delete newDebt.__v;
        delete newDebt['createdAt'];
        delete newDebt['updatedAt'];
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
exports.DebtsService = DebtsService;
//# sourceMappingURL=debts.service.js.map