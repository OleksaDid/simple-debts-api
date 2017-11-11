import * as passport from 'passport';
import { Response } from 'express';
import User from '../models/User';
import * as crypto from 'crypto';
import { passwordResetMessage } from '../helpers/nodemailer';
import { PassportHelper } from '../helpers/passport';
import { ErrorHandler } from '../helpers/error-handler';


export class AuthController {

    public checkJWTAccess = passport.authenticate('jwt', { session: false });

    private passportConfig = new PassportHelper();

    private errorHandler = new ErrorHandler();

    

    constructor() {
        this.setupPassportStrategies();
    }



    /*
    * GET
    * /auth/facebook/login
    * @header Authorization Must contain 'Bearer <FB_TOKEN>'
     */
    facebookLogin = (req: any, res: Response, next): void => {

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
    localSignUp = (req, res, next): void => {
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
    localLogin = (req, res, next): void => {
        passport.authenticate('local-login', (err, user) => {
            this.standartStrategyHandler(req, res, err, user, 'Please, check your request params!');
        })(req, res, next);
    };

    /*
     * POST
     * /reset-password
     * @param email String User's email to send message to
     */
    resetPasswordSendEmail = (req, res): void => {
        req.assert('email', 'Email is invalid').isEmail();

        const errors = req.validationErrors();

        if (errors) {
            return this.errorHandler.errorHandler(req, res, errors);
        }

        const email = req.swagger ? req.swagger.params.email.value : req.body.email;

        User.findOne({email}).exec()
            .then((user: any) => {
                if(!user) {
                    throw 'User with this email is not found';
                }

                const token = crypto.randomBytes(5).toString('hex');

                user.resetPasswordToken = token;
                user.resetPasswordTokenExpires = Date.now() + 1000 * 60 * 20; // 20 minutes

                return user.save()
                    .then(() => {
                        return passwordResetMessage({
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
                return res.json({status: 'sent'});
            })
            .catch(err => this.errorHandler.errorHandler(req, res, err));
    };

    checkLoginStatus = (req, res: Response ): void => {
        res.status(200);
        res.send('Success');
    };



    private standartStrategyHandler(req, res, err, user, errorMessage: string): void {
        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                return this.errorHandler.errorHandler(req, res, oauthError.error.message);
            } else {
                return this.errorHandler.errorHandler(req, res, err);
            }
        } else if(!user || Object.keys(user).length === 0) {
            return this.errorHandler.errorHandler(req, res, errorMessage);
        } else {
            return res.json(user);
        }
    }

    private setupPassportStrategies(): void {
        this.passportConfig.verifyFbToken();
        this.passportConfig.localAuth();
        this.passportConfig.localLogin();
        this.passportConfig.verifyJWT();
    }
}