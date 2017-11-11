import * as mongoose from 'mongoose';
import { Id } from './common';
import { Schema } from 'mongoose';
import { MoneyOperationClass } from './MoneyOperation';

type DebtsStatus = 'CREATION_AWAITING' | 'UNCHANGED' | 'CHANGE_AWAITING' | 'USER_DELETED';
export type DebtsAccountType = 'SINGLE_USER' | 'MULTIPLE_USERS';

export type DebtsModel = mongoose.Document & {
    users: Id[],

    type: DebtsAccountType,

    countryCode: string,

    status: DebtsStatus,
    statusAcceptor: Id | null,

    summary: number,
    moneyReceiver: Id | null,

    moneyOperations: MoneyOperationClass[]
};

export class DebtsModelClass {
    users: Id[];

    type: DebtsAccountType;

    countryCode: string;

    status: DebtsStatus;
    statusAcceptor: Id | null;

    summary: number;
    moneyReceiver: Id | null;

    moneyOperations: MoneyOperationClass[];

    constructor(creatorId: Id, secondUserId: Id, type: DebtsAccountType, countryCode: string) {
        this.users = [creatorId, secondUserId];
        this.type = type;
        this.countryCode = countryCode;
        this.status = type === 'SINGLE_USER' ? 'UNCHANGED' : 'CREATION_AWAITING';
        this.statusAcceptor = type === 'SINGLE_USER' ? null : secondUserId;
        this.summary = 0;
        this.moneyReceiver = null;
        this.moneyOperations = [];
    }
}

export class DebtsListSummary  {
    toGive: number;
    toTake: number;

    constructor(toGive: number, toTake: number) {
        this.toGive = toGive;
        this.toTake = toTake;
    }
}

export class DebtsListClass {
    debts: DebtsModel[];
    summary: DebtsListSummary;

    constructor(debts: DebtsModel[], userId: Id) {
        this.debts = debts;
        this.summary = new DebtsListSummary(0, 0);
        this.calculateSummary(userId);
    }

    calculateSummary(userId: Id) {
        this.summary = this.debts.reduce((summary, debt) => {
            if(debt.moneyReceiver === null) {
                return summary;
            }
            if(debt.moneyReceiver.toString() === userId.toString()) {
                return {
                  toGive: summary.toGive,
                  toTake: summary.toTake + debt.summary
                };
            }
            if(debt.moneyReceiver.toString() !== userId.toString()) {
                return {
                    toGive: summary.toGive + debt.summary,
                    toTake: summary.toTake
                };
            }
        }, this.summary);
    }
}


function DebtsAccountType(key, options) {
    mongoose.SchemaType.call(this, key, options, 'DebtsAccountType');
}
DebtsAccountType.prototype = Object.create(mongoose.SchemaType.prototype);


DebtsAccountType.prototype.cast = function(val) {
    const statuses = ['SINGLE_USER', 'MULTIPLE_USERS'];

    if(statuses.indexOf(val) === -1) {
        throw new Error('DebtsAccountType: ' + val + ' is not valid');
    }

    return val;
};

mongoose.Schema.Types['DebtsAccountType'] = DebtsAccountType;


function StatusCodeDebts(key, options) {
    mongoose.SchemaType.call(this, key, options, 'StatusCodeDebts');
}
StatusCodeDebts.prototype = Object.create(mongoose.SchemaType.prototype);


StatusCodeDebts.prototype.cast = function(val) {
    const statuses = ['CREATION_AWAITING', 'UNCHANGED', 'CHANGE_AWAITING', 'USER_DELETED'];

    if(statuses.indexOf(val) === -1) {
        throw new Error('StatusCodeDebts: ' + val + ' is not valid');
    }

    return val;
};

mongoose.Schema.Types['StatusCodeDebts'] = StatusCodeDebts;


const debtsSchema = new mongoose.Schema({
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    type: Schema.Types['DebtsAccountType'],

    countryCode: String,

    status: Schema.Types['StatusCodeDebts'],
    statusAcceptor: { type: Schema.Types.ObjectId, ref: 'User' },

    summary: Number,
    moneyReceiver: { type: Schema.Types.ObjectId, ref: 'User' },

    moneyOperations: [{ type: Schema.Types.ObjectId, ref: 'MoneyOperation' }]
}, { timestamps: true });


const Debts = mongoose.model('Debts', debtsSchema);
export default Debts;