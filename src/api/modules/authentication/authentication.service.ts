import * as passport from 'passport';
import * as FacebookTokenStrategy from 'passport-facebook-token';
import * as jwt from 'jsonwebtoken';
import * as passportJWT from 'passport-jwt';
import * as LocalStrategy from 'passport-local';

import {
    ACCESS_TOKEN_EXP_SECONDS, EMAIL_NAME_PATTERN, EMAIL_PATTERN,
    REFRESH_TOKEN_EXP_SECONDS
} from '../../common/constants';
import User from '../users/user.schema';
import { UserInterface } from '../users/user.interface';
import { SendUserDto } from '../users/user.dto';
import { getImagesPath } from '../../services/get-images-path.service';
import { JwtPayloadInterface } from './jwt-payload.interface';
import { Id } from '../../common/types';



export class AuthenticationService {
    private ExtractJwt = passportJWT.ExtractJwt;
    private JwtStrategy = passportJWT.Strategy;

    private JWTStrategyOptions = {
        jwtFromRequest: this.ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
        ignoreExpiration: true
    };
    
    private RefreshTokenStrategyOptions = Object.assign(
        {}, 
        this.JWTStrategyOptions, 
        {
            secretOrKey: process.env.REFRESH_JWT_SECRET
        }
    );

    private localStrategyOptions = {
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    };

    private facebookTokenStrategyOptions = {
        clientID: process.env.FACEBOOK_ID,
        clientSecret: process.env.FACEBOOK_SECRET
    };

    private passwordLengthRestrictions = {
        min: 6,
        max: 20
    };



    constructor() {
        this.setupSerializer();
        this.setupDeserializer();
    }



    verifyJWT(): void {
        passport.use('jwt', new this.JwtStrategy(
            this.JWTStrategyOptions,
            (jwt_payload: JwtPayloadInterface, done) => {
                console.log(jwt_payload);

                if(jwt_payload.exp < this.getCurrentDateInSeconds()) {
                    return done(new Error('Access Token Expired'));
                }

                User
                    .findById(jwt_payload.id)
                    .lean()
                    .then((user: UserInterface) => {
                        if (!user || user.accessTokenId !== jwt_payload.jwtid) {
                            throw new Error('Invalid Token');
                        }

                        done(null, new SendUserDto(user._id, user.name, user.picture));
                    })
                    .catch(err => done(err));
            }));
    }


    refreshToken(): void {
        passport.use('refresh-jwt',
            new this.JwtStrategy(
                this.RefreshTokenStrategyOptions,
                (jwt_payload: JwtPayloadInterface, done) => {
                    console.log(jwt_payload);

                    if(jwt_payload.exp < this.getCurrentDateInSeconds()) {
                        return done(new Error('Refresh Token Expired'));
                    }

                    User
                        .findById(jwt_payload.id)
                        .lean()
                        .then((user: UserInterface) => {
                            if (!user || user.refreshTokenId !== jwt_payload.jwtid) {
                                throw new Error('Invalid Token');
                            }

                            return this.updateTokensAndReturnUser(user, done);
                        })
                        .catch(err => done(err));
            })
        );
    }

    // Facebook strategy
    verifyFbToken(): void {
        passport.use(new FacebookTokenStrategy(
            this.facebookTokenStrategyOptions,
            (accessToken, refreshToken, profile, done) => {
                User
                    .findOne({'facebook': profile.id})
                    .exec()
                    .then((user: any) => {

                        if(!user) {
                            user = new User();
                        }

                        user.email = profile._json.email;
                        user.name = `${profile.name.givenName} ${profile.name.familyName}`;
                        user.picture = this.generateFbImagePath(profile.id);
                        user.facebook = profile.id;
                        
                        return user.save();
                    })
                    .then((user: UserInterface) => this.updateTokensAndReturnUser(user, done))
                    .catch(err => done(err));
            }));
    }

    // local strategy
    localAuth(): void {
        passport.use('local-signup', new LocalStrategy(
            this.localStrategyOptions,
            (req, email, password, done) => {
                let createdUser;

                // asynchronous
                // User.findOne wont fire unless data is sent back
                process.nextTick(() => {

                    User.findOne({ 'email' :  email })
                        .then((user: UserInterface) => {
                            // check to see if theres already a user with that email
                            if (user) {
                                throw new Error('User with this email already exists');
                            }

                            if(!email.match(EMAIL_PATTERN)) {
                                throw new Error('Email is wrong');
                            }

                            if(
                                password.length < this.passwordLengthRestrictions.min ||
                                password.length > this.passwordLengthRestrictions.max
                            ) {
                                throw new Error('Invalid password length');
                            }

                            // if there is no user with that email
                            // create the user
                            const newUser: any  = new User();

                            // set the user's local credentials
                            newUser.email    = email;
                            newUser.password = newUser.generateHash(password);

                            // save the user
                            return newUser.save();
                        })
                        .then(() => User.findOne({email}))
                        .then((user: UserInterface) => {
                            const newUser: any = new User();
                            createdUser = user;

                            return newUser.generateIdenticon(user.id);
                        })
                        .then(image => {
                            createdUser.picture = getImagesPath(req) + image;
                            createdUser.name = email.match(EMAIL_NAME_PATTERN)[0];

                            return createdUser.save();
                        })
                        .then(() => this.updateTokensAndReturnUser(createdUser, done))
                        .catch(err => done(err));

                });
            }));
    }

    localLogin(): void {
        passport.use('local-login', new LocalStrategy(
            this.localStrategyOptions,
            (req, email, password, done) => { // callback with email and password from our form

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({ 'email' :  email })
                    .then((user: UserInterface) => {

                        // if no user is found, return the message
                        if (!user) {
                            throw new Error('No user is found');
                        }

                        // if the user is found but the password is wrong
                        if (!user.validPassword(password)) {
                            throw new Error('Wrong password');
                        }

                        // all is well, return successful user
                        return this.updateTokensAndReturnUser(user, done);
                    })
                    .catch(err => done(err));

            }));
    }

    

    private updateTokensAndReturnUser(user: UserInterface, done): void {
        const expirationTime = Math.floor(this.getCurrentDateInSeconds()) + ACCESS_TOKEN_EXP_SECONDS;
        const refreshExpirationTime = Math.floor(this.getCurrentDateInSeconds()) + REFRESH_TOKEN_EXP_SECONDS;

        const payload = this.getJWTPayload(user._id, expirationTime);
        const refreshPayload = this.getJWTPayload(user._id, refreshExpirationTime);

        const token = jwt.sign(payload, process.env.JWT_SECRET);
        const refreshToken = jwt.sign(refreshPayload, process.env.REFRESH_JWT_SECRET);

        const sendUser = {
            user: new SendUserDto(user._id, user.name, user.picture),
            token,
            refreshToken
        };

        User
            .findByIdAndUpdate(user._id, {
                accessTokenId: payload.jwtid,
                refreshTokenId: refreshPayload.jwtid
            })
            .then(() => done(null, sendUser));
    }

    private setupSerializer(): void {
        passport.serializeUser<any, any>((user, done) => {
            done(undefined, user.id);
        });
    }

    private getJWTPayload(id: Id, exp: number): JwtPayloadInterface {
        return {
            id,
            exp,
            jwtid: Math.ceil(Math.random() * 10000)
        };
    }

    private getCurrentDateInSeconds(): number {
        const MS_IN_S = 1000;

        return Date.now() / MS_IN_S;
    }

    private setupDeserializer(): void {
        passport.deserializeUser((id, done) => {
            User.findById(id, (err, user) => {
                done(err, user);
            });
        });
    }
    
    private generateFbImagePath(profileId): string {
        return `https://graph.facebook.com/${profileId}/picture?type=large`;
    }
}

