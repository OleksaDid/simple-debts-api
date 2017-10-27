"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multer = require("multer");
const path = require("path");
exports.multerStorage = () => {
    return multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, 'public/images');
        },
        filename: function (req, file, callback) {
            callback(null, file.fieldname + '-' + Date.now() + Math.floor((Math.random() * 100)) + path.extname(file.originalname));
        }
    });
};
//# sourceMappingURL=multer.js.map