import { DebtInterface, DebtsAccountType, DebtsStatus } from '../debts/debt.interface';
import { Id } from '../../common/types';
import { OperationInterface, OperationStatus } from './operation.interface';
import Operation from './operation.schema';
import Debts from '../debts/debt.schema';
import { Types } from 'mongoose';
import { OperationDto } from './operation.dto';

export class OperationsService {


    createOperation = (userId: Id, debtsId: Id, moneyAmount: number, moneyReceiver: Id, description: string) => {
        let operationId;

        return Debts
            .findOne(
                {
                    _id: debtsId,
                    users: {'$all': [userId, moneyReceiver]},
                    $nor: [{status: DebtsStatus.CONNECT_USER}, {status: DebtsStatus.CREATION_AWAITING}]
                },
                'users type'
            )
            .lean()
            .then((debt: DebtInterface) => {
                const statusAcceptor = debt.users.find(user => user.toString() != userId);
                const newOperation = new OperationDto(debtsId, moneyAmount, moneyReceiver, description, statusAcceptor, debt.type);

                return Operation.create(newOperation);
            })
            .then((operation: OperationInterface) => {
                operationId = operation._id;
                return Debts.findById(debtsId);
            })
            .then((debts: DebtInterface) => {

                if(debts.statusAcceptor && debts.statusAcceptor.toString() === userId) {
                    throw new Error('Cannot modify debts that need acceptance');
                }

                if(debts.type !== DebtsAccountType.SINGLE_USER) {
                    debts.statusAcceptor = debts.users.find(user => user.toString() != userId);
                    debts.status = DebtsStatus.CHANGE_AWAITING;
                } else {
                    debts = this.calculateDebtsSummary(debts, moneyReceiver, moneyAmount);
                }

                debts.moneyOperations.push(operationId);

                return debts.save().then(() => debts);
            });
    };

    deleteOperation = (userId: Id, operationId: Id) => {

        return Debts.findOneAndUpdate(
            {
                users: {'$in': [userId]},
                moneyOperations: {'$in': [operationId]},
                type: DebtsAccountType.SINGLE_USER,
                $nor: [{status: DebtsStatus.CONNECT_USER}, {status: DebtsStatus.CREATION_AWAITING}]
            },
            {$pull: {moneyOperations: operationId}}
        )
            .populate({
                path: 'moneyOperations',
                select: 'moneyAmount moneyReceiver',
            })
            .then((debt: DebtInterface) => {
                return Operation
                    .findByIdAndRemove(operationId)
                    .then((operation: OperationInterface) => {
                        if(!operation) {
                            throw new Error('Operation not found');
                        }

                        return debt;
                    });
            })
            .then((debt: DebtInterface) => {
                const operation = debt.moneyOperations.find(op => op.id.toString() === operationId);
                const moneyAmount = operation.moneyAmount;
                const moneyReceiver = debt.users.find(user => user.toString() !== operation.moneyReceiver);

                return this.calculateDebtsSummary(debt, moneyReceiver, moneyAmount)
                    .save()
                    .then(() => debt);
            });
    };

    acceptOperation = (userId: Id, operationId: Id) => {

        return Operation
            .findOneAndUpdate(
                {
                    _id: operationId,
                    statusAcceptor: new Types.ObjectId(userId),
                    status: OperationStatus.CREATION_AWAITING
                },
                { status: OperationStatus.UNCHANGED, statusAcceptor: null }
            )
            .then((operation: OperationInterface) => {
                if(!operation) {
                    throw new Error('Operation not found');
                }

                const moneyReceiver = operation.moneyReceiver;
                const moneyAmount = operation.moneyAmount;

                return Debts
                    .findById(operation.debtsId)
                    .populate({
                        path: 'moneyOperations',
                        select: 'status',
                    })
                    .then((debts: DebtInterface) => {

                        if(debts.moneyOperations.every(operation => operation.status === OperationStatus.UNCHANGED)) {
                            debts.status = DebtsStatus.UNCHANGED;
                            debts.statusAcceptor = null;
                        }

                        return this.calculateDebtsSummary(debts, moneyReceiver, moneyAmount)
                            .save()
                            .then(() => debts);
                    });
            });
    };

    declineOperation = (userId: Id, operationId: Id) => {
        let debtObject: DebtInterface;

        return Operation
            .findOne({_id: operationId, status: OperationStatus.CREATION_AWAITING})
            .then((operation: OperationInterface) => {
                if(!operation) {
                    throw 'Operation is not found';
                }

                return Debts
                    .findOneAndUpdate(
                        {_id: operation.debtsId, users: {$in: [userId]}},
                        {'$pull': {'moneyOperations': operationId}}
                    )
                    .populate({ path: 'moneyOperations', select: 'status'});
            })
            .then((debt: DebtInterface) => {
                if(!debt) {
                    throw 'You don\'t have permissions to delete this operation';
                }

                debtObject = debt;

                return Operation
                    .findByIdAndRemove(operationId);
            })
            .then(() => {
                if(
                    debtObject.moneyOperations
                        .filter(operation => operation.id.toString() !== operationId)
                        .every(operation => operation.status === OperationStatus.UNCHANGED)
                ) {
                    debtObject.status = DebtsStatus.UNCHANGED;
                    debtObject.statusAcceptor = null;
                }

                return debtObject.save();
            });
    };



    private calculateDebtsSummary(debt: DebtInterface, moneyReceiver: Id, moneyAmount: number) {
        debt.summary +=  debt.moneyReceiver !== null
            ? debt.moneyReceiver.toString() == moneyReceiver.toString()
                ? +moneyAmount
                : -moneyAmount
            : +moneyAmount;

        if(debt.summary === 0) {
            debt.moneyReceiver = null;
        }

        if(debt.summary > 0 && debt.moneyReceiver === null) {
            debt.moneyReceiver = moneyReceiver;
        }

        if(debt.summary < 0) {
            debt.moneyReceiver = moneyReceiver;
            debt.summary += (debt.summary * -2);
        }

        return debt;
    }
}
