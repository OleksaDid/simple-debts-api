"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
const error_handler_1 = require("../helpers/error-handler");
const User_1 = require("../models/User");
const crypto = require("crypto");
const nodemailer_1 = require("../helpers/nodemailer");
/*
* GET
* /auth/facebook/login
* @header Authorization Must contain 'Bearer <FB_TOKEN>'
 */
exports.facebookLogin = (req, res, next) => {
    // calling this so as to catch error and respond without 500 and pass all the details to the user.
    passport.authenticate('facebook-token', (err, user) => {
        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                return error_handler_1.errorHandler(req, res, oauthError.error.message);
            }
            else {
                return error_handler_1.errorHandler(req, res, err);
            }
        }
        else if (!user || Object.keys(user).length === 0) {
            return error_handler_1.errorHandler(req, res, 'Invalid token');
        }
        else {
            return res.json(user);
        }
    })(req, res, next);
};
/*
* POST
* /auth/local/sign-up
* @param email String User's email
* @param password String User's password must be form 6 to 20 symbols length
 */
exports.localSignUp = (req, res, next) => {
    // calling this so as to catch error and respond without 500 and pass all the details to the user.
    passport.authenticate('local-signup', (err, user) => {
        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                return error_handler_1.errorHandler(req, res, oauthError.error.message);
            }
            else {
                return error_handler_1.errorHandler(req, res, err);
            }
        }
        else if (!user || Object.keys(user).length === 0) {
            return error_handler_1.errorHandler(req, res, 'Please, check your request params');
        }
        return res.json(user);
    })(req, res, next);
};
/*
 * POST
 * /auth/local/login
 * @param email String User's email
 * @param password String User's password
 */
exports.localLogin = (req, res, next) => {
    passport.authenticate('local-login', (err, user) => {
        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                return error_handler_1.errorHandler(req, res, oauthError.error.message);
            }
            else {
                return error_handler_1.errorHandler(req, res, err);
            }
        }
        else if (!user || Object.keys(user).length === 0) {
            return error_handler_1.errorHandler(req, res, 'Please, check your request params');
        }
        else {
            return res.json(user);
        }
    })(req, res, next);
};
/*
 * POST
 * /reset-password
 * @param email String User's email to send message to
 */
exports.resetPasswordSendEmail = (req, res) => {
    req.assert('email', 'Email is invalid').isEmail();
    const errors = req.validationErrors();
    if (errors) {
        return error_handler_1.errorHandler(req, res, errors);
    }
    const email = req.swagger ? req.swagger.params.email.value : req.body.email;
    User_1.default.findOne({ email }).exec()
        .then((user) => {
        if (!user) {
            return error_handler_1.errorHandler(req, res, 'User with this email is not found');
        }
        const token = crypto.randomBytes(5).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordTokenExpires = Date.now() + 1000 * 60 * 20; // 20 minutes
        user.save(err => {
            if (err) {
                return error_handler_1.errorHandler(req, res, err);
            }
            return nodemailer_1.passwordResetMessage({
                to: user.email
            }, {
                username: user.name || 'dear User',
                token: token
            }).then(value => {
                console.log(value);
                res.status(200);
                return res.json({ status: 'sent' });
            }).catch(err => error_handler_1.errorHandler(req, res, err));
        });
    })
        .catch(err => error_handler_1.errorHandler(req, res, err));
};
exports.checkLoginStatus = (req, res) => {
    res.status(200);
    return res.send('Success');
};
//# sourceMappingURL=auth.js.map