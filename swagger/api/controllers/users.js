"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../models/User");
const multerConfig = require("../helpers/multer");
const path = require("path");
const multer = require("multer");
const Debts_1 = require("../models/Debts");
const static_1 = require("../helpers/static");
const error_handler_1 = require("../helpers/error-handler");
class UsersController {
    constructor() {
        this.errorHandler = new error_handler_1.ErrorHandler();
        /*
         * GET
         * /users
         */
        this.getUsersArrayByName = (req, res) => {
            const name = req.swagger ? req.swagger.params.name.value : req.query.name;
            if (!name || name.length === 0) {
                return this.errorHandler.errorHandler(req, res, 'Name must not be empty');
            }
            const userId = req.user.id;
            Debts_1.default
                .find({ 'users': { '$all': [userId] } })
                .populate({ path: 'users', select: 'name picture' })
                .exec()
                .then((debts) => {
                const usedUserIds = debts.map(debt => debt.users.find(user => user.id.toString() != userId).id);
                User_1.default
                    .find({
                    'name': new RegExp(name, 'i'),
                    virtual: false
                })
                    .limit(15)
                    .exec()
                    .then((users) => {
                    const sendUsers = users
                        .filter(user => user.id != userId && !usedUserIds.find(id => user.id == id))
                        .map(user => new User_1.SendUser(user.id, user.name, user.picture));
                    res.status(200);
                    res.json(sendUsers);
                });
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        /*
         * POST
         * /users
         * @header Content-Type multipart/form-data
         * @param name String Name of user
         * @param image File User's avatar
         */
        this.updateUserData = (req, res) => {
            req.assert('name', 'Name field should not be empty').notEmpty();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const name = req.swagger ? req.swagger.params.name.value : req.body.name;
            const userId = req.user.id;
            const userInfo = { name };
            if (req.file && req.file.filename) {
                userInfo.picture = static_1.StaticHelper.getImagesPath(req) + req.file.filename;
            }
            return User_1.default.findByIdAndUpdate(userId, userInfo)
                .then((resp) => {
                if (!resp) {
                    return this.errorHandler.errorHandler(req, res, 'User not found');
                }
                const user = new User_1.SendUser(resp.id, userInfo.name, userInfo.picture || resp.picture);
                res.status(200);
                return res.json(user);
            }).catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        this.uploadImage = (req, res, next) => {
            const upload = multer({
                storage: multerConfig.multerStorage(),
                fileFilter: (req, file, callback) => {
                    const ext = path.extname(file.originalname);
                    const allowedExtensions = ['.png', '.jpg', '.jpeg'];
                    if (allowedExtensions.indexOf(ext) === -1) {
                        return callback(res.json({ error: 'Only images are allowed' }), null);
                    }
                    callback(null, true);
                },
                fieldSize: 512
            }).single('image');
            upload(req, res, err => {
                if (err) {
                    res.status(400);
                    return err;
                }
                next();
            });
        };
    }
}
exports.UsersController = UsersController;
//# sourceMappingURL=users.js.map