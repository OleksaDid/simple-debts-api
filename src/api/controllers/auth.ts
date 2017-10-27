import * as passport from 'passport';
import { Request, Response } from 'express';
import { errorHandler } from '../helpers/error-handler';
import User from '../models/User';
import * as crypto from 'crypto';
import { passwordResetMessage } from '../helpers/nodemailer';

/*
* GET
* /auth/facebook/login
* @header Authorization Must contain 'Bearer <FB_TOKEN>'
 */
export let facebookLogin = (req: any, res: Response, next) => {

    // calling this so as to catch error and respond without 500 and pass all the details to the user.
    passport.authenticate('facebook-token', (err, user) => {

        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                return errorHandler(req, res, oauthError.error.message);
            } else {
                return errorHandler(req, res, err);
            }
        } else if(!user || Object.keys(user).length === 0) {
            return errorHandler(req, res, 'Invalid token');
        } else {
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
export let localSignUp = (req, res, next) => {
    // calling this so as to catch error and respond without 500 and pass all the details to the user.
    passport.authenticate('local-signup', (err, user) => {

        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                return errorHandler(req, res, oauthError.error.message);
            } else {
                return errorHandler(req, res, err);
            }
        } else if(!user || Object.keys(user).length === 0) {
            return errorHandler(req, res, 'Please, check your request params');
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
export let localLogin = (req, res, next) => {
    passport.authenticate('local-login', (err, user) => {

        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                return errorHandler(req, res, oauthError.error.message);
            } else {
                return errorHandler(req, res, err);
            }
        } else if(!user || Object.keys(user).length === 0) {
            return errorHandler(req, res, 'Please, check your request params');
        } else {
            return res.json(user);
        }
    })(req, res, next);
};


/*
 * POST
 * /reset-password
 * @param email String User's email to send message to
 */
export let resetPasswordSendEmail = (req, res) => {
    req.assert('email', 'Email is invalid').isEmail();

    const errors = req.validationErrors();

    if (errors) {
        return errorHandler(req, res, errors);
    }

    const email = req.swagger ? req.swagger.params.email.value : req.body.email;

    User.findOne({email}).exec()
        .then((user: any) => {
            if(!user) {
                return errorHandler(req, res, 'User with this email is not found');
            }

            const token = crypto.randomBytes(5).toString('hex');

            user.resetPasswordToken = token;
            user.resetPasswordTokenExpires = Date.now() + 1000 * 60 * 20; // 20 minutes

            user.save(err => {
                if(err) {
                    return errorHandler(req, res, err);
                }

                return passwordResetMessage({
                    to: user.email
                }, {
                    username: user.name || 'dear User',
                    token: token
                }).then(value => {
                    console.log(value);
                    res.status(200);
                    return res.json({status: 'sent'});
                }).catch(err => errorHandler(req, res, err));
            });
        })
        .catch(err => errorHandler(req, res, err));
};

export let checkLoginStatus = ( req, res: Response ) => {
    res.status(200);
    return res.send('Success');
};