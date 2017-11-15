"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_schema_1 = require("./user.schema");
const user_dto_1 = require("./user.dto");
const debt_schema_1 = require("../debts/debt.schema");
const error_handler_service_1 = require("../../services/error-handler.service");
const get_images_path_service_1 = require("../../services/get-images-path.service");
class UsersController {
    constructor() {
        this.errorHandler = new error_handler_service_1.ErrorHandler();
        /*
         * GET
         * /users
         * @query name String String to search users by name
         */
        this.getUsersArrayByName = (req, res) => {
            req.assert('name', 'User name is empty').notEmpty();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const name = req['swagger'] ? req['swagger'].params.name.value : req.query.name;
            const userId = req['user'].id;
            let usedUserIds;
            debt_schema_1.default
                .find({ 'users': { '$all': [userId] } })
                .populate({ path: 'users', select: 'name picture' })
                .exec()
                .then((debts) => {
                usedUserIds = debts
                    .map(debt => debt.users.find(user => user['id'].toString() != userId)['id']);
                return user_schema_1.default
                    .find({
                    'name': new RegExp(name, 'i'),
                    virtual: false
                })
                    .limit(15)
                    .exec();
            })
                .then((users) => {
                const sendUsers = users
                    .filter(user => user.id != userId && !usedUserIds.find(id => user.id == id))
                    .map(user => new user_dto_1.SendUserDto(user.id, user.name, user.picture));
                return res.status(200).json(sendUsers);
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
            const name = req['swagger'] ? req['swagger'].params.name.value : req.body.name;
            const userId = req['user'].id;
            const fileName = req['file'] && req['file'].filename ? req['file'].filename : null;
            const userInfo = new user_dto_1.UpdateUserDataDto(name, fileName ? get_images_path_service_1.getImagesPath(req) + fileName : null);
            return user_schema_1.default.findByIdAndUpdate(userId, userInfo)
                .then((updatedUser) => {
                if (!updatedUser) {
                    return this.errorHandler.errorHandler(req, res, 'User not found');
                }
                const user = new user_dto_1.SendUserDto(updatedUser.id, userInfo.name, userInfo.picture || updatedUser.picture);
                return res.status(200).json(user);
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
    }
}
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map