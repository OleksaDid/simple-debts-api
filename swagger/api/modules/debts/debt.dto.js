"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debt_interface_1 = require("./debt.interface");
const validation_object_1 = require("../../common/validation-object");
class DebtDto {
    constructor(creatorId, secondUserId, type, countryCode) {
        this.users = [creatorId, secondUserId];
        this.type = type;
        this.countryCode = countryCode;
        this.status = type === debt_interface_1.DebtsAccountType.SINGLE_USER ? debt_interface_1.DebtsStatus.UNCHANGED : debt_interface_1.DebtsStatus.CREATION_AWAITING;
        this.statusAcceptor = type === debt_interface_1.DebtsAccountType.SINGLE_USER ? null : secondUserId;
        this.summary = 0;
        this.moneyReceiver = null;
        this.moneyOperations = [];
    }
}
exports.DebtDto = DebtDto;
class DebtsListDto {
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
                return new DebtsListSummary(summary.toGive, summary.toTake + debt.summary);
            }
            if (debt.moneyReceiver.toString() !== userId.toString()) {
                return new DebtsListSummary(summary.toGive + debt.summary, summary.toTake);
            }
        }, this.summary);
    }
}
exports.DebtsListDto = DebtsListDto;
class DebtsListSummary {
    constructor(toGive, toTake) {
        this.toGive = toGive;
        this.toTake = toTake;
    }
}
class DebtsIdValidationObject extends validation_object_1.ValidationObject {
    constructor(errors, userId, debtsId) {
        super(errors, userId);
        this.debtsId = debtsId;
    }
}
exports.DebtsIdValidationObject = DebtsIdValidationObject;
//# sourceMappingURL=debt.dto.js.map