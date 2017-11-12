"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
class DebtsModelClass {
    constructor(creatorId, secondUserId, type, countryCode) {
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
exports.DebtsModelClass = DebtsModelClass;
class DebtsListSummary {
    constructor(toGive, toTake) {
        this.toGive = toGive;
        this.toTake = toTake;
    }
}
exports.DebtsListSummary = DebtsListSummary;
class DebtsListClass {
    constructor(debts, userId) {
        this.debts = debts;
        this.summary = new DebtsListSummary(0, 0);
        this.calculateSummary(userId);
    }
    calculateSummary(userId) {
        this.summary = this.debts.reduce((summary, debt) => {
            if (debt.moneyReceiver === null) {
                return summary;
            }
            if (debt.moneyReceiver.toString() === userId.toString()) {
                return {
                    toGive: summary.toGive,
                    toTake: summary.toTake + debt.summary
                };
            }
            if (debt.moneyReceiver.toString() !== userId.toString()) {
                return {
                    toGive: summary.toGive + debt.summary,
                    toTake: summary.toTake
                };
            }
        }, this.summary);
    }
}
exports.DebtsListClass = DebtsListClass;
function DebtsAccountType(key, options) {
    mongoose.SchemaType.call(this, key, options, 'DebtsAccountType');
}
DebtsAccountType.prototype = Object.create(mongoose.SchemaType.prototype);
DebtsAccountType.prototype.cast = function (val) {
    const statuses = ['SINGLE_USER', 'MULTIPLE_USERS'];
    if (statuses.indexOf(val) === -1) {
        throw new Error('DebtsAccountType: ' + val + ' is not valid');
    }
    return val;
};
mongoose.Schema.Types['DebtsAccountType'] = DebtsAccountType;
function StatusCodeDebts(key, options) {
    mongoose.SchemaType.call(this, key, options, 'StatusCodeDebts');
}
StatusCodeDebts.prototype = Object.create(mongoose.SchemaType.prototype);
StatusCodeDebts.prototype.cast = function (val) {
    const statuses = ['CREATION_AWAITING', 'UNCHANGED', 'CHANGE_AWAITING', 'USER_DELETED', 'CONNECT_USER'];
    if (statuses.indexOf(val) === -1) {
        throw new Error('StatusCodeDebts: ' + val + ' is not valid');
    }
    return val;
};
mongoose.Schema.Types['StatusCodeDebts'] = StatusCodeDebts;
const debtsSchema = new mongoose.Schema({
    users: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    type: mongoose_1.Schema.Types['DebtsAccountType'],
    countryCode: String,
    status: mongoose_1.Schema.Types['StatusCodeDebts'],
    statusAcceptor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    summary: Number,
    moneyReceiver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    moneyOperations: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'MoneyOperation' }]
}, { timestamps: true });
const Debts = mongoose.model('Debts', debtsSchema);
exports.default = Debts;
//# sourceMappingURL=Debts.js.map