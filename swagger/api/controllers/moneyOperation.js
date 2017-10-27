"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debts_1 = require("../models/Debts");
const MoneyOperation_1 = require("../models/MoneyOperation");
const debts_1 = require("./debts");
const mongoose = require("mongoose");
const error_handler_1 = require("../helpers/error-handler");
const ObjectId = mongoose.Types.ObjectId;
/*
 * PUT
 * /operation
 * @param debtsId Id Id of Debts document to push operation in
 * @param moneyAmount Number Amount of money
 * @param moneyReceiver Id Id of User that receives money
 * @param description String Some notes about operation
 */
exports.createOperation = (req, res) => {
    req.assert('debtsId', 'Debts Id is not valid').notEmpty();
    req.assert('moneyAmount', 'moneyAmount is not a number').isNumeric();
    req.assert('moneyAmount', 'moneyAmount is empty').notEmpty();
    req.assert('moneyReceiver', 'moneyReceiver is not valid').notEmpty();
    req.assert('description', 'description length is not valid').isLength({ min: 0, max: 70 });
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const debtsId = req.swagger ? req.swagger.params.debtsId.value : req.body.debtsId;
    const moneyAmount = req.swagger ? req.swagger.params.moneyAmount.value : req.body.moneyAmount;
    const moneyReceiver = req.swagger ? req.swagger.params.moneyReceiver.value : req.body.moneyReceiver;
    const description = req.swagger ? req.swagger.params.description.value : req.body.description;
    const userId = req.user.id;
    if (+moneyAmount <= 0) {
        return error_handler_1.errorHandler(req, res, 'Money amount is less then or equal 0');
    }
    return Debts_1.default.findOne({ _id: debtsId, users: { '$all': [userId, moneyReceiver] } }, 'users type').lean().exec()
        .then((resp) => {
        const statusAcceptor = resp.users.find(user => user.toString() != userId);
        const newOperation = new MoneyOperation_1.MoneyOperationClass(debtsId, moneyAmount, moneyReceiver, description, statusAcceptor, resp.type);
        return MoneyOperation_1.default.create(newOperation)
            .then(operation => {
            return Debts_1.default.findById(debtsId, (err, debts) => {
                if (err) {
                    return error_handler_1.errorHandler(req, res, err);
                }
                if (debts.statusAcceptor && debts.statusAcceptor.toString() === userId) {
                    return error_handler_1.errorHandler(req, res, 'Cannot modify debts that need acceptance');
                }
                if (debts.type !== 'SINGLE_USER') {
                    debts.statusAcceptor = statusAcceptor;
                    debts.status = 'CHANGE_AWAITING';
                }
                else {
                    debts.summary += debts.moneyReceiver !== null
                        ? debts.moneyReceiver == moneyReceiver
                            ? +moneyAmount
                            : -moneyAmount
                        : +moneyAmount;
                    if (debts.summary === 0) {
                        debts.moneyReceiver = null;
                    }
                    if (debts.summary > 0 && debts.moneyReceiver === null) {
                        debts.moneyReceiver = moneyReceiver;
                    }
                    if (debts.summary < 0) {
                        debts.moneyReceiver = moneyReceiver;
                        debts.summary += (debts.summary * -2);
                    }
                }
                debts.moneyOperations.push(operation._id);
                debts.save((err, updatedDebts) => {
                    if (err) {
                        return error_handler_1.errorHandler(req, res, err);
                    }
                    return debts_1.getDebtsByIdHelper(req, res, debts._id);
                });
            });
        })
            .catch(err => error_handler_1.errorHandler(req, res, err));
    })
        .catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * DELETE
 * /operation
 * @param operationId Id Id of the Operation that need to be deleted
 */
exports.deleteOperation = (req, res) => {
    req.assert('id', 'Operation Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const operationId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return Debts_1.default.findOneAndUpdate({ 'users': { '$in': [userId] }, 'moneyOperations': { '$in': [operationId] }, 'type': 'SINGLE_USER' }, { '$pull': { 'moneyOperations': operationId } })
        .populate({
        path: 'moneyOperations',
        select: 'moneyAmount moneyReceiver',
    })
        .then((debt) => {
        return MoneyOperation_1.default.findByIdAndRemove(operationId)
            .then((resp) => {
            if (!resp) {
                return error_handler_1.errorHandler(req, res, 'Operation not found');
            }
            const operation = debt.moneyOperations.find(op => op.id.toString() === operationId);
            const moneyAmount = operation.moneyAmount;
            const moneyReceiver = debt.users.find(user => user.toString() !== operation.moneyReceiver);
            debt.summary += debt.moneyReceiver !== null
                ? debt.moneyReceiver == moneyReceiver
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
            debt.save((err, updatedDebts) => {
                if (err) {
                    return error_handler_1.errorHandler(req, res, err);
                }
                return debts_1.getDebtsByIdHelper(req, res, debt._id);
            });
        })
            .catch(err => error_handler_1.errorHandler(req, res, err));
    })
        .catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * POST
 * /operation/creation
 * @param operationId Id Id of the Operation that need to be accepted
 */
exports.acceptOperation = (req, res) => {
    req.assert('id', 'Operation Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const operationId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return MoneyOperation_1.default.findOneAndUpdate({ _id: operationId, statusAcceptor: new ObjectId(userId) }, { status: 'UNCHANGED', statusAcceptor: null })
        .then((resp) => {
        if (!resp) {
            return error_handler_1.errorHandler(req, res, 'Operation not found');
        }
        const moneyReceiver = resp.moneyReceiver;
        const moneyAmount = resp.moneyAmount;
        return Debts_1.default
            .findById(resp.debtsId)
            .populate({
            path: 'moneyOperations',
            select: 'status',
        })
            .then((debts) => {
            if (debts.moneyOperations.every(operation => operation.status === 'UNCHANGED')) {
                debts.status = 'UNCHANGED';
                debts.statusAcceptor = null;
            }
            debts.summary += debts.moneyReceiver !== null
                ? debts.moneyReceiver.toString() == moneyReceiver.toString()
                    ? +moneyAmount
                    : -moneyAmount
                : +moneyAmount;
            if (debts.summary === 0) {
                debts.moneyReceiver = null;
            }
            if (debts.summary > 0 && debts.moneyReceiver === null) {
                debts.moneyReceiver = moneyReceiver;
            }
            if (debts.summary < 0) {
                debts.moneyReceiver = moneyReceiver;
                debts.summary += (debts.summary * -2);
            }
            debts.save((err, updatedDebts) => {
                if (err) {
                    return error_handler_1.errorHandler(req, res, err);
                }
                return debts_1.getDebtsByIdHelper(req, res, debts._id);
            });
        })
            .catch(err => error_handler_1.errorHandler(req, res, err));
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * DELETE
 * /operation/creation
 * @param operationId Id Id of the Operation that need to be declined
 */
exports.declineOperation = (req, res) => {
    req.assert('id', 'Operation Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const operationId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return MoneyOperation_1.default.findOneAndRemove({ _id: operationId, statusAcceptor: new ObjectId(userId) })
        .then((resp) => {
        if (!resp) {
            return error_handler_1.errorHandler(req, res, 'Operation not found');
        }
        return Debts_1.default.findByIdAndUpdate(resp.debtsId, { status: 'UNCHANGED', statusAcceptor: null })
            .then(debts => {
            return debts_1.getDebtsByIdHelper(req, res, debts._id);
        }).catch(err => error_handler_1.errorHandler(req, res, err));
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
//# sourceMappingURL=moneyOperation.js.map