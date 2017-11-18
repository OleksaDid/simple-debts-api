"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const operation_interface_1 = require("../modules/operations/operation.interface");
const debt_interface_1 = require("../modules/debts/debt.interface");
function StatusCodeOperations(key, options) {
    mongoose_1.SchemaType.call(this, key, options, 'StatusCodeOperations');
}
StatusCodeOperations.prototype = Object.create(mongoose_1.SchemaType.prototype);
StatusCodeOperations.prototype.cast = val => {
    const valuesArray = [
        operation_interface_1.OperationStatus.CREATION_AWAITING,
        operation_interface_1.OperationStatus.UNCHANGED
    ];
    if (valuesArray.indexOf(val) === -1) {
        throw new Error('Debt type: \"' + val + '\" is not valid');
    }
    return val;
};
mongoose_1.Schema.Types['StatusCodeOperations'] = StatusCodeOperations;
function DebtsType(key, options) {
    mongoose_1.SchemaType.call(this, key, options, 'DebtsType');
}
DebtsType.prototype = Object.create(mongoose_1.SchemaType.prototype);
DebtsType.prototype.cast = val => {
    const valuesArray = [
        debt_interface_1.DebtsAccountType.SINGLE_USER,
        debt_interface_1.DebtsAccountType.MULTIPLE_USERS
    ];
    if (valuesArray.indexOf(val) === -1) {
        throw new Error('Debt type: \"' + val + '\" is not valid');
    }
    return val;
};
mongoose_1.Schema.Types['DebtsType'] = DebtsType;
function StatusCodeDebts(key, options) {
    mongoose_1.SchemaType.call(this, key, options, 'StatusCodeDebts');
}
StatusCodeDebts.prototype = Object.create(mongoose_1.SchemaType.prototype);
StatusCodeDebts.prototype.cast = val => {
    const valuesArray = [
        debt_interface_1.DebtsStatus.UNCHANGED,
        debt_interface_1.DebtsStatus.CREATION_AWAITING,
        debt_interface_1.DebtsStatus.CHANGE_AWAITING,
        debt_interface_1.DebtsStatus.USER_DELETED,
        debt_interface_1.DebtsStatus.CONNECT_USER
    ];
    if (valuesArray.indexOf(val) === -1) {
        throw new Error('Debt type: \"' + val + '\" is not valid');
    }
    return val;
};
mongoose_1.Schema.Types['StatusCodeDebts'] = StatusCodeDebts;
exports.default = mongoose_1.Schema;
//# sourceMappingURL=custom-mongoose-types.service.js.map