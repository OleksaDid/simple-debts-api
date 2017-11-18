"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const custom_mongoose_types_service_1 = require("../../services/custom-mongoose-types.service");
const debtsSchema = new custom_mongoose_types_service_1.default({
    users: [{ type: custom_mongoose_types_service_1.default.Types.ObjectId, ref: 'User' }],
    type: custom_mongoose_types_service_1.default.Types['DebtsType'],
    countryCode: String,
    status: custom_mongoose_types_service_1.default.Types['StatusCodeDebts'],
    statusAcceptor: { type: custom_mongoose_types_service_1.default.Types.ObjectId, ref: 'User' },
    summary: Number,
    moneyReceiver: { type: custom_mongoose_types_service_1.default.Types.ObjectId, ref: 'User' },
    moneyOperations: [{ type: custom_mongoose_types_service_1.default.Types.ObjectId, ref: 'MoneyOperation' }]
}, { timestamps: true });
const Debts = mongoose_1.model('Debts', debtsSchema);
exports.default = Debts;
//# sourceMappingURL=debt.schema.js.map