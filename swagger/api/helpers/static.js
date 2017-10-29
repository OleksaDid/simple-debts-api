"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class StaticHelper {
    static getImagesPath(req) {
        return req.protocol + '://' + req.get('host') + '/images/';
    }
}
exports.StaticHelper = StaticHelper;
//# sourceMappingURL=static.js.map