import { Request, Response } from 'express';
import { DebtInterface, DebtsAccountType, DebtsStatus } from './debt.interface';
import { Id } from '../../common/types';
import { UserInterface } from '../users/user.interface';
import User from '../users/user.schema';
import { CloneRealUserToVirtualDto } from '../users/user.dto';
import Debts from './debt.schema';
import Operation from '../operations/operation.schema';
import { OperationInterface, OperationStatus } from '../operations/operation.interface';
import { IMAGES_FOLDER_FILE_PATTERN } from '../../common/constants';
import * as fs from 'fs';
import { DebtsListDto } from './debt.dto';
import { ErrorHandler } from '../../services/error-handler.service';



export class DebtsService {
    
    private errorHandler = new ErrorHandler();
    
    

    deleteMultipleDebts = (req: Request, res: Response, debt: DebtInterface, userId: Id) => {
        const deletedUserInfo = debt.users.find(user => user['_id'].toString() === userId.toString());

        let createdVirtualUser: UserInterface;


        return User.create([
            new CloneRealUserToVirtualDto(deletedUserInfo['name'], deletedUserInfo['picture'])
        ])
            .then((user: UserInterface[]) => {
                createdVirtualUser = user[0];

                return Debts.findByIdAndUpdate(debt.id, {
                    type: DebtsAccountType.SINGLE_USER,
                    status: DebtsStatus.USER_DELETED,
                    $pull: {'users': userId}
                });
            })
            .then((debt: DebtInterface) => {
                debt.statusAcceptor = debt.users.find(user => user.toString() !== userId.toString());
                debt.users.push(createdVirtualUser._id);

                const promises = [];
                debt['moneyOperations']
                    .forEach(operationId => promises.push(Operation.findById(operationId)));

                return debt
                    .save()
                    .then(() => Promise.all(promises));
            })
            .then((operations: OperationInterface[]) => {
                const promises = operations.map(operation => {
                    if(operation.moneyReceiver.toString() === userId.toString()) {
                        operation.moneyReceiver = createdVirtualUser._id;
                    }
                    if(operation.statusAcceptor.toString() === userId.toString()) {
                        operation.statusAcceptor = null;
                        operation.status = OperationStatus.UNCHANGED;
                    }
                    return operation.save();
                });

                return Promise.all(promises);
            })
            .then(() => this.getAllUserDebts(req, res));
    };

    deleteSingleDebt = (req: Request, res: Response, debt: DebtInterface, userId: Id) => {
        const virtualUserId = debt.users.find(user => user['_id'].toString() != userId);

        return debt
            .remove()
            .then(() => User.findByIdAndRemove(virtualUserId))
            .then((user: UserInterface) => {
                if(!user) {
                    throw new Error('User not found');
                }

                const imageName = user.picture.match(IMAGES_FOLDER_FILE_PATTERN);

                fs.unlinkSync('public' + imageName);

                return this.getAllUserDebts(req, res);
            });
    };

    getAllUserDebts = (req: Request, res: Response) => {
        const userId = req['user'].id;

        return Debts
            .find({
                $or: [
                    {users: {'$all': [userId]}},
                    {status: DebtsStatus.CONNECT_USER, statusAcceptor: userId}
                ]
            })
            .populate({ path: 'users', select: 'name picture virtual'})
            .sort({status: 1, updatedAt: -1})
            .lean()
            .then((debts: DebtInterface[]) => {
                if(debts) {
                    const debtsArray = debts.map(debt => this.formatDebt(debt, userId, false));

                    res.json(new DebtsListDto(debtsArray, userId));
                }
            });
    };

    getDebtsById = (req: Request, res: Response, debts?: Id) => {
        const debtsId = debts ? debts : (req['swagger'] ? req['swagger'].params.id.value : req.params.id);
        const userId = req['user'].id;

        return Debts
            .findById(debtsId)
            .populate({
                path: 'moneyOperations',
                select: 'date moneyAmount moneyReceiver description status statusAcceptor',
                options: { sort: { 'date': -1 } }
            })
            .populate({ path: 'users', select: 'name picture virtual'})
            .lean()
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw new Error('Debts with id ' + debtsId + ' is not found');
                }

                res.json(this.formatDebt(debt, userId, true));
            });
    };



    
    private formatDebt(debt: DebtInterface, userId: Id, saveOperations: boolean) {
        let newDebt = debt;

        // make preview for user connect
        if(debt.status === DebtsStatus.CONNECT_USER && debt.statusAcceptor === userId) {
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

        if(saveOperations) {
            newDebt.moneyOperations.forEach(operation => {
                operation.id = operation._id;
                delete operation._id;
            });
        } else {
            delete newDebt.moneyOperations;
        }

        return newDebt;
    }
}