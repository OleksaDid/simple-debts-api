import { Schema, SchemaType } from 'mongoose';
import { OperationStatus } from '../modules/operations/operation.interface';
import { DebtsAccountType, DebtsStatus } from '../modules/debts/debt.interface';



function StatusCodeOperations(key, options) {
    SchemaType.call(this, key, options, 'StatusCodeOperations');
}
StatusCodeOperations.prototype = Object.create(SchemaType.prototype);

StatusCodeOperations.prototype.cast = val => {
    const valuesArray = [
        OperationStatus.CREATION_AWAITING,
        OperationStatus.UNCHANGED
    ];
    if(valuesArray.indexOf(val) === -1) {
        throw new Error('Debt type: \"' + val + '\" is not valid');
    }

    return val;
};

Schema.Types['StatusCodeOperations'] = StatusCodeOperations;




function DebtsType(key, options) {
    SchemaType.call(this, key, options, 'DebtsType');
}
DebtsType.prototype = Object.create(SchemaType.prototype);

DebtsType.prototype.cast = val => {
    const valuesArray = [
        DebtsAccountType.SINGLE_USER,
        DebtsAccountType.MULTIPLE_USERS
    ];

    if(valuesArray.indexOf(val) === -1) {
        throw new Error('Debt type: \"' + val + '\" is not valid');
    }

    return val;
};

Schema.Types['DebtsType'] =  DebtsType;




function StatusCodeDebts(key, options) {
    SchemaType.call(this, key, options, 'StatusCodeDebts');
}
StatusCodeDebts.prototype = Object.create(SchemaType.prototype);

StatusCodeDebts.prototype.cast = val => {
    const valuesArray = [
        DebtsStatus.UNCHANGED,
        DebtsStatus.CREATION_AWAITING,
        DebtsStatus.CHANGE_AWAITING,
        DebtsStatus.USER_DELETED,
        DebtsStatus.CONNECT_USER
    ];

    if(valuesArray.indexOf(val) === -1) {
        throw new Error('Debt type: \"' + val + '\" is not valid');
    }

    return val;
};

Schema.Types['StatusCodeDebts'] = StatusCodeDebts;




export default Schema;