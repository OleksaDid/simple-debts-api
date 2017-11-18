import { Request, Response } from 'express';
import { DebtInterface } from '../debts/debt.interface';
import { ErrorHandler } from '../../services/error-handler.service';
import { DebtsService } from '../debts/debts.service';
import { OperationsService } from './operations.service';
import { OperationIdValidationObject } from "./operation.dto";



export class OperationsController {

    private debtsService = new DebtsService();
    private operationsService = new OperationsService();
    private errorHandler = new ErrorHandler();



    /*
     * PUT
     * /operation
     * @param debtsId Id Id of Debts document to push operation in
     * @param moneyAmount Number Amount of money
     * @param moneyReceiver Id Id of User that receives money
     * @param description String Some notes about operation
     */
    createOperation = (req: Request, res: Response) => {
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

        if(+moneyAmount <= 0 ) {
            return this.errorHandler.responseError(req, res, 'Money amount is less then or equal 0');
        }

        this.operationsService
            .createOperation(userId, debtsId, moneyAmount, moneyReceiver, description)
            .then((debts: DebtInterface) => this.debtsService.getDebtsById(userId, debts._id))
            .then(debt => res.status(200).json(debt))
            .catch(err => this.errorHandler.responseError(req, res, err));

    };

    /*
     * DELETE
     * /operation
     * @param operationId Id Id of the Operation that need to be deleted
     */
    deleteOperation = (req: Request, res: Response) => {
        const {errors, operationId, userId} = this.validateOperationId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        this.operationsService
            .deleteOperation(userId, operationId)
            .then((debt: DebtInterface) => this.debtsService.getDebtsById(userId, debt._id))
            .then(debt => res.status(200).json(debt))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
     * POST
     * /operation/creation
     * @param operationId Id Id of the Operation that need to be accepted
     */
    acceptOperation = (req: Request, res: Response) => {
        const {errors, operationId, userId} = this.validateOperationId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        this.operationsService
            .acceptOperation(userId, operationId)
            .then((debts: DebtInterface) => this.debtsService.getDebtsById(userId, debts._id))
            .then(debt => res.status(200).json(debt))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
     * DELETE
     * /operation/creation
     * @param operationId Id Id of the Operation that need to be declined
     */
    declineOperation = (req: Request, res: Response) => {
        const {errors, operationId, userId} = this.validateOperationId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        this.operationsService
            .declineOperation(userId, operationId)
            .then((debt: DebtInterface) => this.debtsService.getDebtsById(userId, debt._id))
            .then(debt => res.status(200).json(debt))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };



    private validateOperationId = (req: Request) => {
        req.assert('id', 'Operation Id is not valid').isMongoId();
        const errors = req.validationErrors();
        const operationId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const userId = req['user'].id;

        return new OperationIdValidationObject(errors, userId, operationId);
    };
}
