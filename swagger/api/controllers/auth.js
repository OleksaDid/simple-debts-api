"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
const User_1 = require("../models/User");
const crypto = require("crypto");
const nodemailer_1 = require("../helpers/nodemailer");
const passport_1 = require("../helpers/passport");
const error_handler_1 = require("../helpers/error-handler");
class AuthController {
    constructor() {
        this.checkJWTAccess = passport.authenticate('jwt', { session: false });
        this.passportConfig = new passport_1.PassportHelper();
        this.errorHandler = new error_handler_1.ErrorHandler();
        /*
        * GET
        * /auth/facebook/login
        * @header Authorization Must contain 'Bearer <FB_TOKEN>'
         */
        this.facebookLogin = (req, res, next) => {
            // calling this so as to catch error and respond without 500 and pass all the details to the user.
            passport.authenticate('facebook-token', (err, user) => {
                this.standartStrategyHandler(req, res, err, user, 'Invalid token');
            })(req, res, next);
        };
        /*
        * POST
        * /auth/local/sign-up
        * @param email String User's email
        * @param password String User's password must be form 6 to 20 symbols length
         */
        this.localSignUp = (req, res, next) => {
            // calling this so as to catch error and respond without 500 and pass all the details to the user.
            passport.authenticate('local-signup', (err, user) => {
                this.standartStrategyHandler(req, res, err, user, 'Please, check your request params!');
            })(req, res, next);
        };
        /*
         * POST
         * /auth/local/login
         * @param email String User's email
         * @param password String User's password
         */
        this.localLogin = (req, res, next) => {
            passport.authenticate('local-login', (err, user) => {
                this.standartStrategyHandler(req, res, err, user, 'Please, check your request params!');
            })(req, res, next);
        };
        /*
         * POST
         * /reset-password
         * @param email String User's email to send message to
         */
        this.resetPasswordSendEmail = (req, res) => {
            req.assert('email', 'Email is invalid').isEmail();
            const errors = req.validationErrors();
            if (errors) {
                return this.errorHandler.errorHandler(req, res, errors);
            }
            const email = req.swagger ? req.swagger.params.email.value : req.body.email;
            User_1.default.findOne({ email }).exec()
                .then((user) => {
                if (!user) {
                    throw 'User with this email is not found';
                }
                const token = crypto.randomBytes(5).toString('hex');
                user.resetPasswordToken = token;
                user.resetPasswordTokenExpires = Date.now() + 1000 * 60 * 20; // 20 minutes
                return user.save()
                    .then(() => {
                    return nodemailer_1.passwordResetMessage({
                        to: user.email
                    }, {
                        username: user.name || 'dear User',
                        token: token
                    });
                });
            })
                .then(value => {
                console.log(value);
                res.status(200);
                return res.json({ status: 'sent' });
            })
                .catch(err => this.errorHandler.errorHandler(req, res, err));
        };
        this.checkLoginStatus = (req, res) => {
            res.status(200);
            res.send('Success');
        };
        this.setupPassportStrategies();
    }
    standartStrategyHandler(req, res, err, user, errorMessage) {
        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                return this.errorHandler.errorHandler(req, res, oauthError.error.message);
            }
            else {
                return this.errorHandler.errorHandler(req, res, err);
            }
        }
        else if (!user || Object.keys(user).length === 0) {
            return this.errorHandler.errorHandler(req, res, errorMessage);
        }
        else {
            return res.json(user);
        }
    }
    setupPassportStrategies() {
        this.passportConfig.verifyFbToken();
        this.passportConfig.localAuth();
        this.passportConfig.localLogin();
        this.passportConfig.verifyJWT();
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.js.map