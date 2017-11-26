"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_handler_service_1 = require("../../services/error-handler.service");
const debts_service_1 = require("../debts/debts.service");
const operations_service_1 = require("./operations.service");
const operation_dto_1 = require("./operation.dto");
class OperationsController {
    constructor() {
        this.debtsService = new debts_service_1.DebtsService();
        this.operationsService = new operations_service_1.OperationsService();
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
                return this.errorHandler.responseError(req, res, errors);
            }
            const debtsId = req['swagger'] ? req['swagger'].params.debtsId.value : req.body.debtsId;
            const moneyAmount = req['swagger'] ? req['swagger'].params.moneyAmount.value : req.body.moneyAmount;
            const moneyReceiver = req['swagger'] ? req['swagger'].params.moneyReceiver.value : req.body.moneyReceiver;
            const description = req['swagger'] ? req['swagger'].params.description.value : req.body.description;
            const userId = req['user'].id;
            if (+moneyAmount <= 0) {
                return this.errorHandler.responseError(req, res, 'Money amount is less then or equal 0');
            }
            this.operationsService
                .createOperation(userId, debtsId, moneyAmount, moneyReceiver, description)
                .then((debts) => this.debtsService.getDebtsById(userId, debts._id))
                .then(debt => res.status(200).json(debt))
                .catch(err => this.errorHandler.responseError(req, res, err));
        };
        /*
         * DELETE
         * /operation
         * @param operationId Id Id of the Operation that need to be deleted
         */
        this.deleteOperation = (req, res) => {
            const { errors, operationId, userId } = this.validateOperationId(req);
            if (errors) {
                return this.errorHandler.responseError(req, res, errors);
            }
            this.operationsService
                .deleteOperation(userId, operationId)
                .then((debt) => this.debtsService.getDebtsById(userId, debt._id))
                .then(debt => res.status(200).json(debt))
                .catch(err => this.errorHandler.responseError(req, res, err));
        };
        /*
         * POST
         * /operation/creation
         * @param operationId Id Id of the Operation that need to be accepted
         */
        this.acceptOperation = (req, res) => {
            const { errors, operationId, userId } = this.validateOperationId(req);
            if (errors) {
                return this.errorHandler.responseError(req, res, errors);
            }
            this.operationsService
                .acceptOperation(userId, operationId)
                .then((debts) => this.debtsService.getDebtsById(userId, debts._id))
                .then(debt => res.status(200).json(debt))
                .catch(err => this.errorHandler.responseError(req, res, err));
        };
        /*
         * DELETE
         * /operation/creation
         * @param operationId Id Id of the Operation that need to be declined
         */
        this.declineOperation = (req, res) => {
            const { errors, operationId, userId } = this.validateOperationId(req);
            if (errors) {
                return this.errorHandler.responseError(req, res, errors);
            }
            this.operationsService
                .declineOperation(userId, operationId)
                .then((debt) => this.debtsService.getDebtsById(userId, debt._id))
                .then(debt => res.status(200).json(debt))
                .catch(err => this.errorHandler.responseError(req, res, err));
        };
        this.validateOperationId = (req) => {
            req.assert('id', 'Operation Id is not valid').isMongoId();
            const errors = req.validationErrors();
            const operationId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
            const userId = req['user'].id;
            return new operation_dto_1.OperationIdValidationObject(errors, userId, operationId);
        };
    }
}
exports.OperationsController = OperationsController;
//# sourceMappingURL=operations.controller.js.map