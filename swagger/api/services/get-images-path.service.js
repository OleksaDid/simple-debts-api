"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getImagesPath = (req) => req.protocol + '://' + req.get('host') + '/images/';
exports.getImagesPath = getImagesPath;
//# sourceMappingURL=get-images-path.service.js.map