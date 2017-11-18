"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const operation_interface_1 = require("./operation.interface");
const debt_interface_1 = require("../debts/debt.interface");
const validation_object_1 = require("../../common/validation-object");
class OperationDto {
    constructor(debtsId, moneyAmount, moneyReceiver, description, statusAcceptor, debtsType) {
        this.debtsId = debtsId;
        this.date = new Date();
        this.moneyAmount = moneyAmount;
        this.moneyReceiver = moneyReceiver;
        this.description = description;
        this.status = debtsType === debt_interface_1.DebtsAccountType.SINGLE_USER ? operation_interface_1.OperationStatus.UNCHANGED : operation_interface_1.OperationStatus.CREATION_AWAITING;
        this.statusAcceptor = debtsType === debt_interface_1.DebtsAccountType.SINGLE_USER ? null : statusAcceptor;
    }
}
exports.OperationDto = OperationDto;
class OperationIdValidationObject extends validation_object_1.ValidationObject {
    constructor(errors, userId, operationId) {
        super(errors, userId);
        this.operationId = operationId;
    }
}
exports.OperationIdValidationObject = OperationIdValidationObject;
//# sourceMappingURL=operation.dto.js.map