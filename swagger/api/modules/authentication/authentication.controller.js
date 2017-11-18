"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
const authentication_service_1 = require("./authentication.service");
const error_handler_service_1 = require("../../services/error-handler.service");
class AuthController {
    constructor() {
        this.authService = new authentication_service_1.AuthenticationService();
        this.errorHandler = new error_handler_service_1.ErrorHandler();
        /*
        * GET
        * /auth/facebook/login
        * @header Authorization Must contain 'Bearer <FB_TOKEN>'
         */
        this.facebookLogin = (req, res, next) => {
            const errorMsg = 'Invalid token';
            // calling this so as to catch error and respond without 500 and pass all the details to the user.
            passport.authenticate('facebook-token', (err, user) => this.standartStrategyHandler(req, res, err, user, errorMsg))(req, res, next);
        };
        /*
        * POST
        * /auth/local/sign-up
        * @param email String User's email
        * @param password String User's password must be form 6 to 20 symbols length
         */
        this.localSignUp = (req, res, next) => {
            const errorMsg = 'Please, check your request params!';
            // calling this so as to catch error and respond without 500 and pass all the details to the user.
            passport.authenticate('local-signup', (err, user) => this.standartStrategyHandler(req, res, err, user, errorMsg))(req, res, next);
        };
        /*
         * POST
         * /auth/local/login
         * @param email String User's email
         * @param password String User's password
         */
        this.localLogin = (req, res, next) => {
            const errorMsg = 'Please, check your request params!';
            passport.authenticate('local-login', (err, user) => this.standartStrategyHandler(req, res, err, user, errorMsg))(req, res, next);
        };
        /**
         * GET /login_status
         * @param {e.Request} req
         * @param {Response} res
         */
        this.checkLoginStatus = (req, res) => res.status(200).send('Success');
        this.setupPassportStrategies();
    }
    standartStrategyHandler(req, res, err, user, errorMessage) {
        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                this.errorHandler.responseError(req, res, oauthError.error.message);
            }
            else {
                this.errorHandler.responseError(req, res, err);
            }
        }
        else if (!user || Object.keys(user).length === 0) {
            this.errorHandler.responseError(req, res, errorMessage);
        }
        else {
            res.json(user);
        }
    }
    setupPassportStrategies() {
        this.authService.verifyFbToken();
        this.authService.localAuth();
        this.authService.localLogin();
        this.authService.verifyJWT();
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=authentication.controller.js.map