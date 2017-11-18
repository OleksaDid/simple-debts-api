import * as passport from 'passport';
import { NextFunction, Request, Response } from 'express';
import { AuthenticationService } from './authentication.service';
import { SendUserDto } from '../users/user.dto';
import { ErrorHandler } from "../../services/error-handler.service";


export class AuthController {

    private authService = new AuthenticationService();

    private errorHandler = new ErrorHandler();



    constructor() {
        this.setupPassportStrategies();
    }



    /*
    * GET
    * /auth/facebook/login
    * @header Authorization Must contain 'Bearer <FB_TOKEN>'
     */
    facebookLogin = (req: Request, res: Response, next: NextFunction): void => {
        const errorMsg = 'Invalid token';

        // calling this so as to catch error and respond without 500 and pass all the details to the user.
        passport.authenticate(
            'facebook-token', 
            (err, user) => this.standartStrategyHandler(req, res, err, user, errorMsg)
        )(req, res, next);
    };

    /*
    * POST
    * /auth/local/sign-up
    * @param email String User's email
    * @param password String User's password must be form 6 to 20 symbols length
     */
    localSignUp = (req: Request, res: Response, next: NextFunction): void => {
        const errorMsg = 'Please, check your request params!';
        // calling this so as to catch error and respond without 500 and pass all the details to the user.
        passport.authenticate(
            'local-signup', 
            (err, user) => this.standartStrategyHandler(req, res, err, user, errorMsg)
        )(req, res, next);
    };

    /*
     * POST
     * /auth/local/login
     * @param email String User's email
     * @param password String User's password
     */
    localLogin = (req: Request, res: Response, next: NextFunction): void => {
        const errorMsg = 'Please, check your request params!';
        
        passport.authenticate(
            'local-login', 
            (err, user) => this.standartStrategyHandler(req, res, err, user, errorMsg)
        )(req, res, next);
    };


    /**
     * GET /login_status
     * @param {e.Request} req
     * @param {Response} res
     */
    checkLoginStatus = (req: Request, res: Response ): Response => res.status(200).send('Success');




    private standartStrategyHandler(req: Request, res: Response, err, user: SendUserDto, errorMessage: string): void {
        if (err) {
            if (err.oauthError) {
                const oauthError = JSON.parse(err.oauthError.data);
                this.errorHandler.responseError(req, res, oauthError.error.message);
            } else {
                this.errorHandler.responseError(req, res, err);
            }
        } else if(!user || Object.keys(user).length === 0) {
            this.errorHandler.responseError(req, res, errorMessage);
        } else {
            res.json(user);
        }
    }

    private setupPassportStrategies(): void {
        this.authService.verifyFbToken();
        this.authService.localAuth();
        this.authService.localLogin();
        this.authService.verifyJWT();
    }
}