"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Debts_1 = require("../models/Debts");
const User_1 = require("../models/User");
const fs = require("fs");
const error_handler_1 = require("../helpers/error-handler");
/*
 * PUT
 * /debts
 * @param userId Id Id of the user you want to create a common Debts with
 * @param countryCode String ISO2 country code
 */
exports.createNewDebt = (req, res) => {
    req.assert('userId', 'User Id is not valid').notEmpty();
    req.assert('countryCode', 'Country code is empty').notEmpty();
    req.assert('countryCode', 'Country code length must be 2').isLength({ min: 2, max: 2 });
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const userId = req.swagger ? req.swagger.params.userId.value : req.body.userId;
    const countryCode = req.swagger ? req.swagger.params.countryCode.value : req.body.countryCode;
    const creatorId = req.user.id;
    if (userId == creatorId) {
        return error_handler_1.errorHandler(req, res, 'You cannot create Debts with yourself');
    }
    return User_1.default.findById(userId).exec().then((user) => {
        return Debts_1.default.findOne({ 'users': { '$all': [userId, creatorId] } }).exec().then((debts) => {
            if (debts) {
                return error_handler_1.errorHandler(req, res, 'Such debts object is already created');
            }
            const newDebts = new Debts_1.DebtsModelClass(creatorId, userId, 'MULTIPLE_USERS', countryCode);
            return Debts_1.default.create(newDebts).then((resp) => {
                return exports.getDebtsByIdHelper(req, res, resp._id);
            }).catch(err => error_handler_1.errorHandler(req, res, err));
        });
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * PUT
 * /debts/single
 * @param userName String Name of virtual user
 * @param countryCode String ISO2 country code
 */
exports.createSingleDebt = (req, res) => {
    req.assert('userName', 'User Name is not valid').notEmpty();
    req.assert('countryCode', 'Country code is empty').notEmpty();
    req.assert('countryCode', 'Country code length must be 2').isLength({ min: 2, max: 2 });
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const userName = req.swagger ? req.swagger.params.userName.value : req.body.userName;
    const countryCode = req.swagger ? req.swagger.params.countryCode.value : req.body.countryCode;
    const creatorId = req.user.id;
    const virtUser = {
        name: userName
    };
    return Debts_1.default.find({ 'users': { '$all': [creatorId] }, 'type': 'SINGLE_USER' })
        .populate({ path: 'users', select: 'name' })
        .lean()
        .then((resp) => {
        if (resp && resp.length > 0 && resp.some(debt => !!debt.users.find(us => us.name === userName))) {
            error_handler_1.errorHandler(req, res, 'You already have virtual user with such name');
            return false;
        }
        return true;
    })
        .then((resp) => {
        if (resp) {
            return User_1.default.create(virtUser).then((user) => {
                const newUser = new User_1.default();
                newUser.generateIdenticon(user.id)
                    .then(image => {
                    user.picture = req.protocol + '://' + req.get('host') + '/images/' + image;
                    user.save(err => {
                        if (err) {
                            return error_handler_1.errorHandler(req, res, err);
                        }
                        const newDebts = new Debts_1.DebtsModelClass(creatorId, user._id, 'SINGLE_USER', countryCode);
                        return Debts_1.default.create(newDebts).then((resp) => {
                            return exports.getDebtsByIdHelper(req, res, resp._id);
                        }).catch(err => error_handler_1.errorHandler(req, res, err));
                    });
                })
                    .catch(err => error_handler_1.errorHandler(req, res, err));
            }).catch(err => error_handler_1.errorHandler(req, res, err));
        }
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * DELETE
 * /debts/single
 * @param debtsId Id Id of Debts you want to delete
 */
exports.deleteSingleDebt = (req, res) => {
    req.assert('id', 'Debts Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return Debts_1.default.findOneAndRemove({ _id: debtsId, users: { $in: [userId] }, type: 'SINGLE_USER' })
        .then((resp) => {
        if (!resp) {
            return error_handler_1.errorHandler(req, res, 'Debts not found');
        }
        const virtualUserId = resp.users.find(user => user.toString() != userId);
        User_1.default.findByIdAndRemove(virtualUserId)
            .then((user) => {
            if (!user) {
                return error_handler_1.errorHandler(req, res, 'User not found');
            }
            const imageName = user.picture.match(/\/images\/.*/);
            fs.unlink('public' + imageName);
            return exports.getAllUserDebts(req, res);
        })
            .catch(err => error_handler_1.errorHandler(req, res, err));
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * POST
 * /debts/creation
 * @param debtsId Id Id of debts you want to accept
 */
exports.acceptCreation = (req, res) => {
    req.assert('id', 'Debts Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return Debts_1.default.findOneAndUpdate({ _id: debtsId, status: 'CREATION_AWAITING', statusAcceptor: userId }, { status: 'UNCHANGED', statusAcceptor: null })
        .then((resp) => {
        if (!resp) {
            return error_handler_1.errorHandler(req, res, 'Debts not found');
        }
        return exports.getAllUserDebts(req, res);
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * DELETE
 * /debts/creation
 * @param debtsId Id Id of debts you want to decline
 */
exports.declineCreation = (req, res) => {
    req.assert('id', 'Debts Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return Debts_1.default.findOneAndRemove({ _id: debtsId, status: 'CREATION_AWAITING', statusAcceptor: userId })
        .then((resp) => {
        if (!resp) {
            return error_handler_1.errorHandler(req, res, 'Debts not found');
        }
        return exports.getAllUserDebts(req, res);
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * GET
 * /debts
 */
exports.getAllUserDebts = (req, res) => {
    const userId = req.user.id;
    return Debts_1.default
        .find({ 'users': { '$all': [userId] } })
        .populate({ path: 'users', select: 'name picture' })
        .sort({ status: 1, updatedAt: -1 })
        .lean()
        .exec((err, debts) => {
        if (err) {
            return error_handler_1.errorHandler(req, res, err);
        }
        if (debts) {
            const debtsArray = debts.map(debt => {
                const newDebt = debt;
                newDebt.user = newDebt.users.find(user => user._id.toString() != userId);
                newDebt.user.id = newDebt.user._id;
                newDebt.id = debt._id;
                delete newDebt._id;
                delete newDebt.user._id;
                delete newDebt.users;
                delete newDebt.moneyOperations;
                delete newDebt.__v;
                delete newDebt.createdAt;
                delete newDebt.updatedAt;
                return newDebt;
            });
            res.json(new Debts_1.DebtsListClass(debtsArray, userId));
        }
    })
        .catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
* GET
* /debts/:id
*/
exports.getDebtsById = (req, res) => {
    return exports.getDebtsByIdHelper(req, res);
};
/*
 * PUT
 * /debts/delete-request
 * @param debtsId Id Id of debts you want to delete
 */
exports.requestDebtsDelete = (req, res) => {
    req.assert('id', 'Debts Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return Debts_1.default.findOne({ _id: debtsId, users: { '$all': [userId] } }, (err, debts) => {
        if (err) {
            return error_handler_1.errorHandler(req, res, err);
        }
        if (debts.statusAcceptor !== null || debts.status !== 'UNCHANGED') {
            return error_handler_1.errorHandler(req, res, 'Cannot modify debts that need acceptance');
        }
        debts.statusAcceptor = debts.users.find(user => user.toString() != userId);
        debts.status = 'DELETE_AWAITING';
        debts.save((err, updatedDebts) => {
            if (err) {
                return error_handler_1.errorHandler(req, res, err);
            }
            return exports.getAllUserDebts(req, res);
        });
    });
};
/*
 * DELETE
 * /debts/delete-request
 * @param debtsId Id Id of debts you want to accept delete
 */
exports.requestDebtsDeleteAccept = (req, res) => {
    req.assert('id', 'Debts Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return Debts_1.default.findOneAndRemove({ _id: debtsId, status: 'DELETE_AWAITING', statusAcceptor: userId })
        .then((resp) => {
        if (!resp) {
            return error_handler_1.errorHandler(req, res, 'Debts not found');
        }
        return exports.getAllUserDebts(req, res);
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
/*
 * POST
 * /debts/delete-request
 * @param debtsId Id Id of debts you want to decline delete
 */
exports.requestDebtsDeleteDecline = (req, res) => {
    req.assert('id', 'Debts Id is not valid').notEmpty();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const debtsId = req.swagger ? req.swagger.params.id.value : req.params.id;
    const userId = req.user.id;
    return Debts_1.default.findOneAndUpdate({ _id: debtsId, status: 'DELETE_AWAITING', statusAcceptor: userId }, { status: 'UNCHANGED', statusAcceptor: null })
        .then((resp) => {
        if (!resp) {
            return error_handler_1.errorHandler(req, res, 'Debts not found');
        }
        return exports.getAllUserDebts(req, res);
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
exports.getDebtsByIdHelper = (req, res, debts) => {
    const debtsId = debts ? debts : (req.swagger ? req.swagger.params.id.value : req.params.id);
    const userId = req.user.id;
    return Debts_1.default.findById(debtsId)
        .populate({
        path: 'moneyOperations',
        select: 'date moneyAmount moneyReceiver description status statusAcceptor',
        options: { sort: { 'date': -1 } }
    })
        .populate({ path: 'users', select: 'name picture' })
        .lean()
        .exec((err, debt) => {
        if (err) {
            return error_handler_1.errorHandler(req, res, err);
        }
        if (!debt) {
            return error_handler_1.errorHandler(req, res, 'Debts with id ' + debtsId + ' is not found');
        }
        if (debt) {
            const newDebt = debt;
            newDebt.user = newDebt.users.find(user => user._id.toString() != userId);
            newDebt.user.id = newDebt.user._id;
            newDebt.id = debt._id;
            delete newDebt._id;
            delete newDebt.user._id;
            delete newDebt.users;
            delete newDebt.__v;
            delete newDebt.createdAt;
            delete newDebt.updatedAt;
            newDebt.moneyOperations.forEach(operation => {
                operation.id = operation._id;
                delete operation._id;
            });
            res.json(newDebt);
        }
    }).catch(err => error_handler_1.errorHandler(req, res, err));
};
//# sourceMappingURL=debts.js.map