"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_dto_1 = require("./user.dto");
const error_handler_service_1 = require("../../services/error-handler.service");
const get_images_path_service_1 = require("../../services/get-images-path.service");
const users_service_1 = require("./users.service");
class UsersController {
    constructor() {
        this.errorHandler = new error_handler_service_1.ErrorHandler();
        this.usersService = new users_service_1.UsersService();
        /*
         * GET
         * /users
         * @query name String String to search users by name
         */
        this.getUsersArrayByName = (req, res) => {
            req.assert('name', 'User name is empty').notEmpty();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.responseError(req, res, errors);
            }
            const name = req['swagger'] ? req['swagger'].params.name.value : req.query.name;
            const userId = req['user'].id;
            this.usersService.getUsersByName(name, userId)
                .then(users => res.status(200).json(users))
                .catch(err => this.errorHandler.responseError(req, res, err));
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
                return this.errorHandler.responseError(req, res, errors);
            }
            const name = req['swagger'] ? req['swagger'].params.name.value : req.body.name;
            const userId = req['user'].id;
            const fileName = req['file'] && req['file'].filename ? req['file'].filename : null;
            const userInfo = new user_dto_1.UpdateUserDataDto(name, fileName ? get_images_path_service_1.getImagesPath(req) + fileName : null);
            this.usersService
                .updateUserData(userId, userInfo)
                .then(users => res.status(200).json(users))
                .catch(err => this.errorHandler.responseError(req, res, err));
        };
    }
}
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map