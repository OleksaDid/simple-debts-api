"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const mongoose = require("mongoose");
class MoneyOperationClass {
    constructor(debtsId, moneyAmount, moneyReceiver, description, statusAcceptor, debtsType) {
        this.debtsId = debtsId;
        this.date = new Date();
        this.moneyAmount = moneyAmount;
        this.moneyReceiver = moneyReceiver;
        this.description = description;
        this.status = debtsType === 'SINGLE_USER' ? 'UNCHANGED' : 'CREATION_AWAITING';
        this.statusAcceptor = debtsType === 'SINGLE_USER' ? null : statusAcceptor;
    }
}
exports.MoneyOperationClass = MoneyOperationClass;
function StatusCodeMoneyOperations(key, options) {
    mongoose.SchemaType.call(this, key, options, 'StatusCodeMoneyOperations');
}
StatusCodeMoneyOperations.prototype = Object.create(mongoose.SchemaType.prototype);
StatusCodeMoneyOperations.prototype.cast = function (val) {
    const statuses = ['CREATION_AWAITING', 'UNCHANGED'];
    if (statuses.indexOf(val) === -1) {
        throw new Error('StatusCodeDebts: ' + val + ' is not valid');
    }
    return val;
};
mongoose.Schema.Types.StatusCodeMoneyOperations = StatusCodeMoneyOperations;
const moneyOperationsSchema = new mongoose.Schema({
    debtsId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Debts' },
    date: { type: Date, default: Date.now },
    moneyAmount: Number,
    moneyReceiver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    description: String,
    status: mongoose_1.Schema.Types.StatusCodeMoneyOperations,
    statusAcceptor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }
});
const MoneyOperation = mongoose.model('MoneyOperation', moneyOperationsSchema);
exports.default = MoneyOperation;
//# sourceMappingURL=MoneyOperation.js.map