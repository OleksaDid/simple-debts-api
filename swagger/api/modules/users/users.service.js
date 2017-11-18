"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debt_schema_1 = require("../debts/debt.schema");
const user_schema_1 = require("./user.schema");
const user_dto_1 = require("./user.dto");
class UsersService {
    constructor() {
        this.getUsersByName = (name, userId) => {
            let usedUserIds;
            return debt_schema_1.default
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
                return users
                    .filter(user => user.id != userId && !usedUserIds.find(id => user.id == id))
                    .map(user => new user_dto_1.SendUserDto(user.id, user.name, user.picture));
            });
        };
        this.updateUserData = (userId, userInfo) => {
            return user_schema_1.default
                .findByIdAndUpdate(userId, userInfo)
                .then((updatedUser) => {
                if (!updatedUser) {
                    throw new Error('User not found');
                }
                return new user_dto_1.SendUserDto(updatedUser.id, userInfo.name, userInfo.picture || updatedUser.picture);
            });
        };
    }
}
exports.UsersService = UsersService;
//# sourceMappingURL=users.service.js.map