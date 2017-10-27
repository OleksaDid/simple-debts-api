import { Id } from './common';
import { Schema } from 'mongoose';
import * as mongoose from 'mongoose';
import { DebtsAccountType } from './Debts';

type OperationStatus = 'CREATION_AWAITING' | 'UNCHANGED';

export class MoneyOperationClass {
    debtsId: Id;
    date: Date;
    moneyAmount: number;
    moneyReceiver: Id;
    description: string;

    status: OperationStatus;
    statusAcceptor: Id | null;

    constructor(debtsId: Id, moneyAmount: number, moneyReceiver: Id, description: string, statusAcceptor: Id, debtsType: DebtsAccountType) {
        this.debtsId = debtsId;
        this.date = new Date();
        this.moneyAmount = moneyAmount;
        this.moneyReceiver = moneyReceiver;
        this.description = description;
        this.status = debtsType === 'SINGLE_USER' ? 'UNCHANGED' : 'CREATION_AWAITING';
        this.statusAcceptor = debtsType === 'SINGLE_USER' ? null : statusAcceptor;
    }
}


function StatusCodeMoneyOperations(key, options) {
    mongoose.SchemaType.call(this, key, options, 'StatusCodeMoneyOperations');
}
StatusCodeMoneyOperations.prototype = Object.create(mongoose.SchemaType.prototype);


StatusCodeMoneyOperations.prototype.cast = function(val) {
    const statuses = ['CREATION_AWAITING', 'UNCHANGED'];

    if(statuses.indexOf(val) === -1) {
        throw new Error('StatusCodeDebts: ' + val + ' is not valid');
    }

    return val;
};

mongoose.Schema.Types.StatusCodeMoneyOperations = StatusCodeMoneyOperations;


const moneyOperationsSchema = new mongoose.Schema({
    debtsId: { type: Schema.Types.ObjectId, ref: 'Debts' },
    date: { type: Date, default: Date.now },
    moneyAmount: Number,
    moneyReceiver: { type: Schema.Types.ObjectId, ref: 'User' },
    description: String,
    status: Schema.Types.StatusCodeMoneyOperations,
    statusAcceptor: { type: Schema.Types.ObjectId, ref: 'User' }
});

const MoneyOperation = mongoose.model('MoneyOperation', moneyOperationsSchema);
export default MoneyOperation;