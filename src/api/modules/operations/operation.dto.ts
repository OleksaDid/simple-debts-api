import { OperationStatus } from './operation.interface';
import { Id } from '../../common/types';
import { DebtsAccountType } from '../debts/debt.interface';

export class OperationDto {
    debtsId: Id;
    date: Date;
    moneyAmount: number;
    moneyReceiver: Id;
    description: string;
    status: OperationStatus;
    statusAcceptor: Id;


    constructor(
        debtsId: Id,
        moneyAmount: number,
        moneyReceiver: Id,
        description: string,
        statusAcceptor: Id,
        debtsType: DebtsAccountType
    ) {
        this.debtsId = debtsId;
        this.date = new Date();
        this.moneyAmount = moneyAmount;
        this.moneyReceiver = moneyReceiver;
        this.description = description;
        this.status = debtsType === DebtsAccountType.SINGLE_USER ? OperationStatus.UNCHANGED : OperationStatus.CREATION_AWAITING;
        this.statusAcceptor = debtsType === DebtsAccountType.SINGLE_USER ? null : statusAcceptor;
    }
}