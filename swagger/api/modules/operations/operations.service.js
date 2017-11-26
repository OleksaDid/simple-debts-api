"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debt_interface_1 = require("../debts/debt.interface");
const operation_interface_1 = require("./operation.interface");
const operation_schema_1 = require("./operation.schema");
const debt_schema_1 = require("../debts/debt.schema");
const mongoose_1 = require("mongoose");
const operation_dto_1 = require("./operation.dto");
class OperationsService {
    constructor() {
        this.createOperation = (userId, debtsId, moneyAmount, moneyReceiver, description) => {
            let operationId;
            return debt_schema_1.default
                .findOne({
                _id: debtsId,
                users: { '$all': [userId, moneyReceiver] },
                $nor: [{ status: debt_interface_1.DebtsStatus.CONNECT_USER }, { status: debt_interface_1.DebtsStatus.CREATION_AWAITING }]
            }, 'users type')
                .lean()
                .then((debt) => {
                const statusAcceptor = debt.users.find(user => user.toString() != userId);
                const newOperation = new operation_dto_1.OperationDto(debtsId, moneyAmount, moneyReceiver, description, statusAcceptor, debt.type);
                return operation_schema_1.default.create(newOperation);
            })
                .then((operation) => {
                operationId = operation._id;
                return debt_schema_1.default.findById(debtsId);
            })
                .then((debts) => {
                if (debts.statusAcceptor && debts.statusAcceptor.toString() === userId) {
                    throw new Error('Cannot modify debts that need acceptance');
                }
                if (debts.type !== debt_interface_1.DebtsAccountType.SINGLE_USER) {
                    debts.statusAcceptor = debts.users.find(user => user.toString() != userId);
                    debts.status = debt_interface_1.DebtsStatus.CHANGE_AWAITING;
                }
                else {
                    debts = this.calculateDebtsSummary(debts, moneyReceiver, moneyAmount);
                }
                debts.moneyOperations.push(operationId);
                return debts.save().then(() => debts);
            });
        };
        this.deleteOperation = (userId, operationId) => {
            return debt_schema_1.default.findOneAndUpdate({
                users: { '$in': [userId] },
                moneyOperations: { '$in': [operationId] },
                type: debt_interface_1.DebtsAccountType.SINGLE_USER,
                $nor: [{ status: debt_interface_1.DebtsStatus.CONNECT_USER }, { status: debt_interface_1.DebtsStatus.CREATION_AWAITING }]
            }, { $pull: { moneyOperations: operationId } })
                .populate({
                path: 'moneyOperations',
                select: 'moneyAmount moneyReceiver',
            })
                .then((debt) => {
                return operation_schema_1.default
                    .findByIdAndRemove(operationId)
                    .then((operation) => {
                    if (!operation) {
                        throw new Error('Operation not found');
                    }
                    return debt;
                });
            })
                .then((debt) => {
                const operation = debt.moneyOperations.find(op => op.id.toString() === operationId);
                const moneyAmount = operation.moneyAmount;
                const moneyReceiver = debt.users.find(user => user.toString() !== operation.moneyReceiver);
                return this.calculateDebtsSummary(debt, moneyReceiver, moneyAmount)
                    .save()
                    .then(() => debt);
            });
        };
        this.acceptOperation = (userId, operationId) => {
            return operation_schema_1.default
                .findOneAndUpdate({
                _id: operationId,
                statusAcceptor: new mongoose_1.Types.ObjectId(userId),
                status: operation_interface_1.OperationStatus.CREATION_AWAITING
            }, { status: operation_interface_1.OperationStatus.UNCHANGED, statusAcceptor: null })
                .then((operation) => {
                if (!operation) {
                    throw new Error('Operation not found');
                }
                const moneyReceiver = operation.moneyReceiver;
                const moneyAmount = operation.moneyAmount;
                return debt_schema_1.default
                    .findById(operation.debtsId)
                    .populate({
                    path: 'moneyOperations',
                    select: 'status',
                })
                    .then((debts) => {
                    if (debts.moneyOperations.every(operation => operation.status === operation_interface_1.OperationStatus.UNCHANGED)) {
                        debts.status = debt_interface_1.DebtsStatus.UNCHANGED;
                        debts.statusAcceptor = null;
                    }
                    return this.calculateDebtsSummary(debts, moneyReceiver, moneyAmount)
                        .save()
                        .then(() => debts);
                });
            });
        };
        this.declineOperation = (userId, operationId) => {
            let debtObject;
            return operation_schema_1.default
                .findOne({ _id: operationId, status: operation_interface_1.OperationStatus.CREATION_AWAITING })
                .then((operation) => {
                if (!operation) {
                    throw 'Operation is not found';
                }
                return debt_schema_1.default
                    .findOneAndUpdate({ _id: operation.debtsId, users: { $in: [userId] } }, { '$pull': { 'moneyOperations': operationId } })
                    .populate({ path: 'moneyOperations', select: 'status' });
            })
                .then((debt) => {
                if (!debt) {
                    throw 'You don\'t have permissions to delete this operation';
                }
                debtObject = debt;
                return operation_schema_1.default
                    .findByIdAndRemove(operationId);
            })
                .then(() => {
                if (debtObject.moneyOperations
                    .filter(operation => operation.id.toString() !== operationId)
                    .every(operation => operation.status === operation_interface_1.OperationStatus.UNCHANGED)) {
                    debtObject.status = debt_interface_1.DebtsStatus.UNCHANGED;
                    debtObject.statusAcceptor = null;
                }
                return debtObject.save();
            });
        };
    }
    calculateDebtsSummary(debt, moneyReceiver, moneyAmount) {
        debt.summary += debt.moneyReceiver !== null
            ? debt.moneyReceiver.toString() == moneyReceiver.toString()
                ? +moneyAmount
                : -moneyAmount
            : +moneyAmount;
        if (debt.summary === 0) {
            debt.moneyReceiver = null;
        }
        if (debt.summary > 0 && debt.moneyReceiver === null) {
            debt.moneyReceiver = moneyReceiver;
        }
        if (debt.summary < 0) {
            debt.moneyReceiver = moneyReceiver;
            debt.summary += (debt.summary * -2);
        }
        return debt;
    }
}
exports.OperationsService = OperationsService;
//# sourceMappingURL=operations.service.js.map