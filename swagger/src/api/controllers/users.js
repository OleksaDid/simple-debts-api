"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../models/User");
const multerConfig = require("../helpers/multer");
const path = require("path");
const multer = require("multer");
const error_handler_1 = require("../helpers/error-handler");
const Debts_1 = require("../models/Debts");
/*
 * GET
 * /users
 */
exports.getUsersArrayByName = (req, res) => {
    const name = req.swagger ? req.swagger.params.name.value : req.query.name;
    if (!name || name.length === 0) {
        return error_handler_1.errorHandler(res, 'Name must not be empty');
    }
    const userId = req.user.id;
    Debts_1.default
        .find({ 'users': { '$all': [userId] } })
        .populate({ path: 'users', select: 'name picture' })
        .exec()
        .then((debts) => {
        const usedUserIds = debts.map(debt => debt.users.find(user => user.id != userId).id);
        User_1.default.find({ 'name': new RegExp(name, 'i') }).limit(15).exec().then((users) => {
            const sendUsers = users
                .filter(user => {
                return user.id != userId && !usedUserIds.find(id => user.id == id);
            })
                .map(user => {
                return {
                    id: user.id,
                    name: user.name,
                    picture: user.picture
                };
            });
            res.status(200);
            res.json(sendUsers);
        });
    })
        .catch(err => error_handler_1.errorHandler(res, err));
};
/*
 * POST
 * /users
 * @header Content-Type multipart/form-data
 * @param name String Name of user
 * @param image File User's avatar
 */
exports.updateUserData = (req, res) => {
    req.assert('name', 'Name field should not be empty').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(res, errors);
    }
    const name = req.swagger ? req.swagger.params.name.value : req.body.name;
    const userId = req.user.id;
    const userInfo = { name };
    if (req.file && req.file.filename) {
        userInfo.picture = req.protocol + '://' + req.get('host') + '/images/' + req.file.filename;
    }
    return User_1.default.findByIdAndUpdate(userId, userInfo)
        .then((resp) => {
        if (!resp) {
            return error_handler_1.errorHandler(res, 'User not found');
        }
        const user = new User_1.SendUser(resp.id, userInfo.name, userInfo.picture);
        res.status(200);
        return res.json(user);
    }).catch(err => error_handler_1.errorHandler(res, err));
};
exports.checkUserProfile = (req, res, next) => {
    const userId = req.user.id;
    if (userId != req.params.id) {
        return error_handler_1.errorHandler(res, 'You cannot modify another user\'s profile');
    }
    next();
};
exports.uploadImage = (req, res, next) => {
    const upload = multer({
        storage: multerConfig.multerStorage(),
        fileFilter: function (req, file, callback) {
            const ext = path.extname(file.originalname);
            if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
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
//# sourceMappingURL=users.js.map