import { Id } from '../../common/types';
import { Document } from 'mongoose';

export enum OperationStatus {
    CREATION_AWAITING = 'CREATION_AWAITING',
    UNCHANGED = 'UNCHANGED'
}

export interface OperationInterface extends Document {
    debtsId: Id;
    date: Date;
    moneyAmount: number;
    moneyReceiver: Id;
    description: string;
    status: OperationStatus;
    statusAcceptor: Id;
}