"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const debts_controller_1 = require("../debts/debts.controller");
const debt_schema_1 = require("../debts/debt.schema");
const debt_interface_1 = require("../debts/debt.interface");
const operation_dto_1 = require("./operation.dto");
const operation_schema_1 = require("./operation.schema");
const operation_interface_1 = require("./operation.interface");
const error_handler_service_1 = require("../../services/error-handler.service");
class OperationsController {
    constructor() {
        this.ObjectId = mongoose.Types.ObjectId;
        this.debtsController = new debts_controller_1.DebtsController();
        this.errorHandler = new error_handler_service_1.ErrorHandler();
        /*
         * PUT
         * /operation
         * @param debtsId Id Id of Debts document to push operation in
         * @param moneyAmount Number Amount of money
         * @param moneyReceiver Id Id of User that receives money
         * @param description String Some notes about operation
         */
        this.createOperation = (req, res) => {
            req.assert('debtsId', 'Debts Id is not valid').isMongoId();
            req.assert('moneyAmount', 'moneyAmount is not a number').isNumeric();
            req.assert('moneyAmount', 'moneyAmount is empty').notEmpty();
            req.assert('moneyReceiver', 'moneyReceiver is not valid').isMongoId();
            req.assert('description', 'description length is not valid').isLength({ min: 0, max: 70 });
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const debtsId = req['swagger'] ? req['swagger'].params.debtsId.value : req.body.debtsId;
            const moneyAmount = req['swagger'] ? req['swagger'].params.moneyAmount.value : req.body.moneyAmount;
            const moneyReceiver = req['swagger'] ? req['swagger'].params.moneyReceiver.value : req.body.moneyReceiver;
            const description = req['swagger'] ? req['swagger'].params.description.value : req.body.description;
            const userId = req['user'].id;
            let operationId;
            if (+moneyAmount <= 0) {
                return this.errorHandler.errorHandler(req, res, 'Money amount is less then or equal 0');
            }
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
                    throw 'Cannot modify debts that need acceptance';
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
            })
                .then((debts) => this.debtsController.getDebtsByIdHelper(req, res, debts._id))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
         * DELETE
         * /operation
         * @param operationId Id Id of the Operation that need to be deleted
         */
        this.deleteOperation = (req, res) => {
            req.assert('id', 'Operation Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const operationId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
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
                        throw 'Operation not found';
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
            })
                .then((debt) => this.debtsController.getDebtsByIdHelper(req, res, debt._id))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
         * POST
         * /operation/creation
         * @param operationId Id Id of the Operation that need to be accepted
         */
        this.acceptOperation = (req, res) => {
            req.assert('id', 'Operation Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const operationId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
            return operation_schema_1.default
                .findOneAndUpdate({
                _id: operationId,
                statusAcceptor: new this.ObjectId(userId),
                status: operation_interface_1.OperationStatus.CREATION_AWAITING
            }, { status: operation_interface_1.OperationStatus.UNCHANGED, statusAcceptor: null })
                .then((operation) => {
                if (!operation) {
                    throw 'Operation not found';
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
            })
                .then((debts) => this.debtsController.getDebtsByIdHelper(req, res, debts._id))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
         * DELETE
         * /operation/creation
         * @param operationId Id Id of the Operation that need to be declined
         */
        this.declineOperation = (req, res) => {
            req.assert('id', 'Operation Id is not valid').isMongoId();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const operationId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
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
            })
                .then((debt) => this.debtsController.getDebtsByIdHelper(req, res, debt._id))
                .catch(err => this.errorHandler.errorHandler(req, res, err));
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
exports.OperationsController = OperationsController;
//# sourceMappingURL=operations.controller.js.map