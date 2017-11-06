import Debts from '../models/Debts';
import MoneyOperation, { MoneyOperationClass } from '../models/MoneyOperation';
import * as mongoose from 'mongoose';
import { DebtsController } from './debts';
import {ErrorHandler} from "../helpers/error-handler";



export class OperationsController {
    private ObjectId = mongoose.Types.ObjectId;
    private debtsController = new DebtsController();
    private errorHandler = new ErrorHandler();



    /*
     * PUT
     * /operation
     * @param debtsId Id Id of Debts document to push operation in
     * @param moneyAmount Number Amount of money
     * @param moneyReceiver Id Id of User that receives money
     * @param description String Some notes about operation
     */
    createOperation = (req, res) => {
        req.assert('debtsId', 'Debts Id is not valid').notEmpty();
        req.assert('moneyAmount', 'moneyAmount is not a number').isNumeric();
        req.assert('moneyAmount', 'moneyAmount is empty').notEmpty();
        req.assert('moneyReceiver', 'moneyReceiver is not valid').notEmpty();
        req.assert('description', 'description length is not valid').isLength({ min: 0, max: 70 });

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const debtsId = req.swagger ? req.swagger.params.debtsId.value : req.body.debtsId;
        const moneyAmount = req.swagger ? req.swagger.params.moneyAmount.value : req.body.moneyAmount;
        const moneyReceiver = req.swagger ? req.swagger.params.moneyReceiver.value : req.body.moneyReceiver;
        const description = req.swagger ? req.swagger.params.description.value : req.body.description;
        const userId = req.user.id;

        let operationId;

        if(+moneyAmount <= 0 ) {
            return this.errorHandler.errorHandler(req, res, 'Money amount is less then or equal 0');
        }

        return Debts
            .findOne(
                { _id: debtsId, users: {'$all': [userId, moneyReceiver]}},
                'users type'
            )
            .lean()
            .exec()
            .then((resp: any) => {
                const statusAcceptor = resp.users.find(user => user.toString() != userId);
                const newOperation = new MoneyOperationClass(debtsId, moneyAmount, moneyReceiver, description, statusAcceptor, resp.type);

                return MoneyOperation.create(newOperation);
            })
            .then(operation => {
                operationId = operation._id;
                return Debts.findById(debtsId);
            })
            .then((debts: any) => {

                if(debts.statusAcceptor && debts.statusAcceptor.toString() === userId) {
                    throw 'Cannot modify debts that need acceptance';
                }

                if(debts.type !== 'SINGLE_USER') {
                    debts.statusAcceptor = debts.users.find(user => user.toString() != userId);
                    debts.status = 'CHANGE_AWAITING';
                } else {
                    debts = this.calculateDebtsSummary(debts, moneyReceiver, moneyAmount);
                }

                debts.moneyOperations.push(operationId);

                return debts.save().then(() => debts);
            })
            .then(debts => this.debtsController.getDebtsByIdHelper(req, res, debts._id))
            .catch(err => this.errorHandler.errorHandler(req, res, err));

    };

    /*
     * DELETE
     * /operation
     * @param operationId Id Id of the Operation that need to be deleted
     */
    deleteOperation = (req, res) => {
        req.assert('id', 'Operation Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const operationId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        return Debts.findOneAndUpdate(
            {'users': {'$in': [userId]}, 'moneyOperations': {'$in': [operationId]}, 'type': 'SINGLE_USER'},
            {'$pull': {'moneyOperations': operationId}}
            )
            .populate({
                path: 'moneyOperations',
                select: 'moneyAmount moneyReceiver',
            })
            .then((debt: any) => MoneyOperation.findByIdAndRemove(operationId).then((resp) => {
                if(!resp) {
                    throw 'Operation not found';
                }
                return debt;
            }))
            .then((debt: any) => {
                const operation = debt.moneyOperations.find(op => op.id.toString() === operationId);
                const moneyAmount = operation.moneyAmount;
                const moneyReceiver = debt.users.find(user => user.toString() !== operation.moneyReceiver);

                return this.calculateDebtsSummary(debt, moneyReceiver, moneyAmount).save().then(() => debt);
            })
            .then(debt => this.debtsController.getDebtsByIdHelper(req, res, debt._id))
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    /*
     * POST
     * /operation/creation
     * @param operationId Id Id of the Operation that need to be accepted
     */
    acceptOperation = (req, res) => {
        req.assert('id', 'Operation Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const operationId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        return MoneyOperation
            .findOneAndUpdate(
                { _id: operationId, statusAcceptor: new this.ObjectId(userId), status: 'CREATION_AWAITING'},
                { status: 'UNCHANGED', statusAcceptor: null }
            )
            .then((resp: any) => {
                if(!resp) {
                    throw 'Operation not found';
                }

                const moneyReceiver = resp.moneyReceiver;
                const moneyAmount = resp.moneyAmount;

                return Debts
                    .findById(resp.debtsId)
                    .populate({
                        path: 'moneyOperations',
                        select: 'status',
                    })
                    .then((debts: any) => {

                        if(debts.moneyOperations.every(operation => operation.status === 'UNCHANGED')) {
                            debts.status = 'UNCHANGED';
                            debts.statusAcceptor = null;
                        }

                        return this.calculateDebtsSummary(debts, moneyReceiver, moneyAmount).save().then(() => debts);
                    });
            })
            .then(debts => this.debtsController.getDebtsByIdHelper(req, res, debts._id))
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    /*
     * DELETE
     * /operation/creation
     * @param operationId Id Id of the Operation that need to be declined
     */
    declineOperation = (req, res) => {
        req.assert('id', 'Operation Id is not valid').notEmpty();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const operationId = req.swagger ? req.swagger.params.id.value : req.params.id;
        const userId = req.user.id;

        let debtObject;

        return MoneyOperation.findOne({_id: operationId, status: 'CREATION_AWAITING'})
            .then((operation: any) => {
                if(!operation) {
                    throw 'Operation is not found';
                }

                return Debts
                    .findOneAndUpdate(
                        {_id: operation.debtsId, users: {$in: [userId]}, type: 'MULTIPLE_USERS'},
                        {'$pull': {'moneyOperations': operationId}}
                    )
                    .populate({ path: 'moneyOperations', select: 'status'});
            })
            .then(debt => {
                if(!debt) {
                    throw 'You don\'t have permissions to delete this operation';
                }

                debtObject = debt;

                return MoneyOperation
                    .findByIdAndRemove(operationId);
            })
            .then(() => {
                if(debtObject.moneyOperations
                        .filter(operation => operation.id.toString() !== operationId)
                        .every(operation => operation.status === 'UNCHANGED')) {
                    debtObject.status = 'UNCHANGED';
                    debtObject.statusAcceptor = null;
                }

                return debtObject.save();
            })
            .then(debts => this.debtsController.getDebtsByIdHelper(req, res, debts._id))
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };



    private calculateDebtsSummary(debts, moneyReceiver, moneyAmount) {
        debts.summary +=  debts.moneyReceiver !== null
            ? debts.moneyReceiver.toString() == moneyReceiver.toString()
                ? +moneyAmount
                : -moneyAmount
            : +moneyAmount;

        if(debts.summary === 0) {
            debts.moneyReceiver = null;
        }

        if(debts.summary > 0 && debts.moneyReceiver === null) {
            debts.moneyReceiver = moneyReceiver;
        }

        if(debts.summary < 0) {
            debts.moneyReceiver = moneyReceiver;
            debts.summary += (debts.summary * -2);
        }

        return debts;
    }
}
