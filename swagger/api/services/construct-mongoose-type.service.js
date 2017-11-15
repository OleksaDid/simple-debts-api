"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const mongooseTypeConstructor = (typeName, valuesArray) => {
    const Type = {};
    Type[typeName] = (key, options) => {
        mongoose_1.SchemaType.call(null, key, options, typeName);
    };
    Type[typeName].prototype = Object.create(mongoose_1.SchemaType.prototype);
    Type[typeName].prototype.cast = val => {
        if (valuesArray.indexOf(val) === -1) {
            throw new Error(typeName + ': \"' + val + '\" is not valid');
        }
        return val;
    };
    return Type[typeName];
};
exports.mongooseTypeConstructor = mongooseTypeConstructor;
//# sourceMappingURL=construct-mongoose-type.service.js.map