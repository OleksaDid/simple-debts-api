"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const custom_mongoose_types_service_1 = require("../../services/custom-mongoose-types.service");
const operationsSchema = new custom_mongoose_types_service_1.default({
    debtsId: { type: custom_mongoose_types_service_1.default.Types.ObjectId, ref: 'Debts' },
    date: { type: Date, default: Date.now },
    moneyAmount: Number,
    moneyReceiver: { type: custom_mongoose_types_service_1.default.Types.ObjectId, ref: 'User' },
    description: String,
    status: custom_mongoose_types_service_1.default.Types['StatusCodeOperations'],
    statusAcceptor: { type: custom_mongoose_types_service_1.default.Types.ObjectId, ref: 'User' }
});
const Operation = mongoose_1.model('MoneyOperation', operationsSchema);
exports.default = Operation;
//# sourceMappingURL=operation.schema.js.map