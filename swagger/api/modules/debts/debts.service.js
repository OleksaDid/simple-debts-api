"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debt_interface_1 = require("./debt.interface");
const user_schema_1 = require("../users/user.schema");
const user_dto_1 = require("../users/user.dto");
const debt_schema_1 = require("./debt.schema");
const operation_schema_1 = require("../operations/operation.schema");
const operation_interface_1 = require("../operations/operation.interface");
const debt_dto_1 = require("./debt.dto");
const users_service_1 = require("../users/users.service");
class DebtsService {
    constructor() {
        this.usersService = new users_service_1.UsersService();
        this.createMultipleDebt = (creatorId, userId, countryCode) => {
            return user_schema_1.default
                .findById(userId)
                .exec()
                .then((user) => {
                if (!user) {
                    throw new Error('User is not found');
                }
                return debt_schema_1.default
                    .findOne({ 'users': { '$all': [userId, creatorId] } })
                    .exec();
            })
                .then((debts) => {
                if (debts) {
                    throw new Error('Such debts object is already created');
                }
                const newDebts = new debt_dto_1.DebtDto(creatorId, userId, debt_interface_1.DebtsAccountType.MULTIPLE_USERS, countryCode);
                return debt_schema_1.default
                    .create(newDebts)
                    .then((debt) => debt);
            });
        };
        this.createSingleDebt = (creatorId, userName, countryCode, imagesPath) => {
            const virtUser = new user_dto_1.CreateVirtualUserDto(userName);
            return debt_schema_1.default
                .find({ 'users': { '$all': [creatorId] }, 'type': debt_interface_1.DebtsAccountType.SINGLE_USER })
                .populate({ path: 'users', select: 'name virtual' })
                .lean()
                .then((debts) => {
                if (debts &&
                    debts.length > 0 &&
                    debts.some(debt => !!debt.users.find(user => user['name'] === userName && user['virtual']))) {
                    throw new Error('You already have virtual user with such name');
                }
                return user_schema_1.default.create(virtUser);
            })
                .then((user) => {
                const newUser = new user_schema_1.default();
                return newUser.generateIdenticon(user.id)
                    .then(image => {
                    user.picture = imagesPath + image;
                    return user.save();
                })
                    .then(() => debt_schema_1.default.create(new debt_dto_1.DebtDto(creatorId, user._id, debt_interface_1.DebtsAccountType.SINGLE_USER, countryCode)));
            });
        };
        this.deleteMultipleDebts = (debt, userId) => {
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
                return Promise.all(promises)
                    .then(() => { }); // transform an array of promises into 1 promise
            });
        };
        this.deleteSingleDebt = (debt, userId) => {
            const virtualUserId = debt.users.find(user => user['_id'].toString() != userId);
            return debt
                .remove()
                .then(() => this.usersService.deleteUser(virtualUserId));
        };
        this.getAllUserDebts = (userId) => {
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
                .then((debts) => {
                if (debts) {
                    const debtsArray = debts.map(debt => this.formatDebt(debt, userId, false));
                    return new debt_dto_1.DebtsListDto(debtsArray, userId);
                }
            });
        };
        this.getDebtsById = (userId, debtsId) => {
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
                    throw new Error('Debts with id ' + debtsId + ' is not found');
                }
                return this.formatDebt(debt, userId, true);
            });
        };
        this.deleteDebt = (userId, debtsId) => {
            return debt_schema_1.default
                .findOne({ _id: debtsId, users: { $in: [userId] } })
                .populate({ path: 'users', select: 'name picture' })
                .then((debt) => {
                if (!debt) {
                    throw new Error('Debts not found');
                }
                if (debt.type === debt_interface_1.DebtsAccountType.SINGLE_USER) {
                    return this.deleteSingleDebt(debt, userId);
                }
                else if (debt.type === debt_interface_1.DebtsAccountType.MULTIPLE_USERS) {
                    return this.deleteMultipleDebts(debt, userId);
                }
            });
        };
        this.acceptDebtsCreation = (userId, debtsId) => {
            return debt_schema_1.default
                .findOneAndUpdate({ _id: debtsId, status: debt_interface_1.DebtsStatus.CREATION_AWAITING, statusAcceptor: userId }, { status: debt_interface_1.DebtsStatus.UNCHANGED, statusAcceptor: null })
                .then((debt) => {
                if (!debt) {
                    throw new Error('Debts not found');
                }
            });
        };
        this.declineDebtsCreation = (userId, debtsId) => {
            return debt_schema_1.default
                .findOneAndRemove({
                _id: debtsId,
                status: debt_interface_1.DebtsStatus.CREATION_AWAITING,
                users: { $in: [userId] }
            })
                .then((debt) => {
                if (!debt) {
                    throw new Error('Debts not found');
                }
            });
        };
        this.acceptUserDeletedStatus = (userId, debtsId) => {
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
                    throw new Error('Debt is not found');
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
            });
        };
        this.connectUserToSingleDebt = (userId, connectUserId, debtsId) => {
            return debt_schema_1.default
                .find({ users: { $all: [userId, connectUserId] } })
                .lean()
                .then((debts) => {
                if (debts && debts['length'] > 0) {
                    throw new Error('You already have Debt with this user');
                }
                return debt_schema_1.default
                    .findOne({ _id: debtsId, type: debt_interface_1.DebtsAccountType.SINGLE_USER, users: { $in: [userId] } });
            })
                .then((debt) => {
                if (!debt) {
                    throw new Error('Debt is not found');
                }
                if (debt.status === debt_interface_1.DebtsStatus.CONNECT_USER) {
                    throw new Error('Some user is already waiting for connection to this Debt');
                }
                if (debt.status === debt_interface_1.DebtsStatus.USER_DELETED) {
                    throw new Error('You can\'t connect user to this Debt until you resolve user deletion');
                }
                debt.status = debt_interface_1.DebtsStatus.CONNECT_USER;
                debt.statusAcceptor = connectUserId;
                return debt.save();
            });
        };
        this.acceptUserConnectionToSingleDebt = (userId, debtsId) => {
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
                promises.push(this.usersService.deleteUser(virtualUserId));
                promises.push(debt_schema_1.default.findByIdAndUpdate(debtsId, {
                    $pull: { users: virtualUserId }
                }));
                return debt.save().then(() => Promise.all(promises));
            })
                .then(() => { });
        };
        this.declineUserConnectionToSingleDebt = (userId, debtsId) => {
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
                    throw new Error('Debt is not found');
                }
            });
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