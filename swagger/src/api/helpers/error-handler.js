"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = (res, err) => {
    if (!res.status) {
        res.status(400);
    }
    return res.json({ error: err });
};
//# sourceMappingURL=error-handler.js.map