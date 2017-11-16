"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const multer = require("multer");
const error_handler_service_1 = require("../services/error-handler.service");
const errorHandler = new error_handler_service_1.ErrorHandler();
const multerStorage = () => {
    return multer.diskStorage({
        destination: function (req, file, callback) {
            callback(null, 'public/images');
        },
        filename: function (req, file, callback) {
            callback(null, file.fieldname + '-' + Date.now() + Math.floor((Math.random() * 100)) + path.extname(file.originalname));
        }
    });
};
const uploadImage = (req, res, next) => {
    const upload = multer({
        storage: multerStorage(),
        fileFilter: (req, file, callback) => {
            const ext = path.extname(file.originalname);
            const allowedExtensions = ['.png', '.jpg', '.jpeg'];
            if (allowedExtensions.indexOf(ext) === -1) {
                return callback('Only images are allowed', null);
            }
            callback(null, true);
        },
        fieldSize: 512
    }).single('image');
    upload(req, res, err => {
        if (err) {
            return errorHandler.responseError(req, res, err);
        }
        next();
    });
};
exports.default = uploadImage;
//# sourceMappingURL=upload-image.middleware.js.map