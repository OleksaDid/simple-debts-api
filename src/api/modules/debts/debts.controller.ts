import { Response, Request } from 'express';
import * as fs from 'fs';
import User from '../users/user.schema';
import Debts from './debt.schema';
import { UserInterface } from '../users/user.interface';
import { DebtInterface, DebtsAccountType, DebtsStatus } from './debt.interface';
import {DebtDto, DebtsIdValidationObject} from './debt.dto';
import { CreateVirtualUserDto } from '../users/user.dto';
import { getImagesPath } from '../../services/get-images-path.service';
import Operation from '../operations/operation.schema';
import { OperationInterface, OperationStatus } from '../operations/operation.interface';
import { ErrorHandler } from '../../services/error-handler.service';
import { IMAGES_FOLDER_FILE_PATTERN } from '../../common/constants';
import { DebtsService } from './debts.service';
import {Id} from "../../common/types";



export class DebtsController {

    private errorHandler = new ErrorHandler();
    private debtsService = new DebtsService();


    /*
     * PUT
     * /debts
     * @param userId Id Id of the user you want to create a common Debts with
     * @param countryCode String ISO2 country code
     */
    createNewDebt = (req: Request, res: Response) => {
        req.assert('userId', 'User Id is not valid').isMongoId();
        req.assert('countryCode', 'Country code is empty').notEmpty();
        req.assert('countryCode', 'Country code length must be 2').isLength({min: 2, max: 2});
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const userId = req['swagger'] ? req['swagger'].params.userId.value : req.body.userId;
        const countryCode = req['swagger'] ? req['swagger'].params.countryCode.value : req.body.countryCode;
        const creatorId = req['user'].id;

        if(userId == creatorId) {
            return this.errorHandler.responseError(req, res, 'You cannot create Debts with yourself');
        }

        this.debtsService
            .createMultipleDebt(creatorId, userId, countryCode)
            .then((debt: DebtInterface) => this.debtsService.getDebtsById(creatorId, debt._id))
            .then(debt => res.status(200).json(debt))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
     * PUT
     * /debts/single
     * @param userName String Name of virtual user
     * @param countryCode String ISO2 country code
     */
    createSingleDebt = (req: Request, res: Response) => {
        req.assert('userName', 'User Name is not valid').notEmpty();
        req.assert('userName', 'User Name is too long (30 characters max)').isLength({min: 1, max: 30});
        req.assert('countryCode', 'Country code is empty').notEmpty();
        req.assert('countryCode', 'Country code length must be 2').isLength({min: 2, max: 2});
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const userName = req['swagger'] ? req['swagger'].params.userName.value : req.body.userName;
        const countryCode = req['swagger'] ? req['swagger'].params.countryCode.value : req.body.countryCode;
        const creatorId = req['user'].id;


        this.debtsService
            .createSingleDebt(creatorId, userName, countryCode, getImagesPath(req))
            .then(debt => this.debtsService.getDebtsById(creatorId, debt._id))
            .then(debt => res.status(200).json(debt))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };


    /*
    * DELETE
    * /debts/:id
    * @param id Id Debts Id
    */
    deleteDebt = (req: Request, res: Response) => {
        const {errors, debtsId, userId} = this.validateDebtsId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        this.debtsService
            .deleteDebt(userId, debtsId)
            .then(() => this.debtsService.getAllUserDebts(userId))
            .then(debtList => res.status(200).json(debtList))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };
    

    /*
     * POST
     * /debts/creation
     * @param debtsId Id Id of debts you want to accept
     */
    acceptCreation = (req: Request, res: Response) => {
        const {errors, debtsId, userId} = this.validateDebtsId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        this.debtsService
            .acceptDebtsCreation(userId, debtsId)
            .then(() => this.debtsService.getAllUserDebts(userId))
            .then(debtList => res.status(200).json(debtList))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
     * DELETE
     * /debts/creation
     * @param debtsId Id Id of debts you want to decline
     */
    declineCreation = (req: Request, res: Response) => {
        const {errors, debtsId, userId} = this.validateDebtsId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

       this.debtsService
           .declineDebtsCreation(userId, debtsId)
           .then(() => this.debtsService.getAllUserDebts(userId))
           .then(debtList => res.status(200).json(debtList))
           .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
     * GET
     * /debts
     */
    getAllUserDebts = (req: Request, res: Response) => {
        const userId = req['user'].id;

        return this.debtsService
            .getAllUserDebts(userId)
            .then(debtsList => res.status(200).json(debtsList))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
    * GET
    * /debts/:id
    */
    getDebtsById = (req: Request, res: Response) => {
        const {errors, debtsId, userId} = this.validateDebtsId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        return this.debtsService
            .getDebtsById(userId, debtsId)
            .then(debts => res.status(200).json(debts))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };


    /*
    * POST /debts/single/:id/i_love_lsd
    * Changes Debts status from USER_DELETED to UNCHANGED
    */
    acceptUserDeletedStatus = (req: Request, res: Response) => {
        const {errors, debtsId, userId} = this.validateDebtsId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        this.debtsService
            .acceptUserDeletedStatus(userId, debtsId)
            .then(() => this.debtsService.getDebtsById(userId, debtsId))
            .then(debts => res.status(200).json(debts))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
    * PUT /debts/single/:id/connect_user
    * Request user to join single_user Debt instead of bot
    * @param userId Id Id of user you want to invite
    * @query id Id Id of single_user Debt
    */
    connectUserToSingleDebt = (req: Request, res: Response) => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        req.assert('userId', 'User Id is not valid').isMongoId();
        const errors = req.validationErrors();
        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const anotherUserId = req['swagger'] ? req['swagger'].params.userId.value : req.body.userId;
        const userId = req['user'].id;

        if(userId.toString() === anotherUserId.toString()) {
            return this.errorHandler.responseError(req, res, 'You can\'t connect yourself');
        }

        this.debtsService
            .connectUserToSingleDebt(userId, anotherUserId, debtsId)
            .then(() => this.debtsService.getDebtsById(userId, debtsId))
            .then(debts => res.status(200).json(debts))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
    * POST /debts/single/:id/connect_user
    * Accept connection invite
    * @query id Id Id of single_user Debt
    */
    acceptUserConnection = (req: Request, res: Response) => {
        const {errors, debtsId, userId} = this.validateDebtsId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        this.debtsService
            .acceptUserConnectionToSingleDebt(userId, debtsId)
            .then(() => this.debtsService.getDebtsById(userId, debtsId))
            .then(debts => res.status(200).json(debts))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };

    /*
    * DELETE /debts/single/:id/connect_user
    * Decline connection invite
    * @query id Id Id of single_user Debt
    */
    declineUserConnection = (req: Request, res: Response) => {
        const {errors, debtsId, userId} = this.validateDebtsId(req);

        if (errors) {
            return this.errorHandler.responseError(req, res, errors);
        }

        this.debtsService
            .declineUserConnectionToSingleDebt(userId, debtsId)
            .then(() => this.debtsService.getAllUserDebts(debtsId))
            .then(debtsList => res.status(200).json(debtsList))
            .catch(err => this.errorHandler.responseError(req, res, err));
    };




    private validateDebtsId = (req: Request): DebtsIdValidationObject => {
        req.assert('id', 'Debts Id is not valid').isMongoId();
        const errors = req.validationErrors();
        const debtsId = req['swagger'] ? req['swagger'].params.id.value : req.params.id;
        const userId = req['user'].id;

        return new DebtsIdValidationObject(errors, userId, debtsId);
    };
    
}

