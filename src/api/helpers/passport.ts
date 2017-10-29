import * as passport from 'passport';
import * as FacebookTokenStrategy from 'passport-facebook-token';
import * as jwt from 'jsonwebtoken';
import * as passportJWT from 'passport-jwt';
import * as LocalStrategy from 'passport-local';

import { default as User, SendUser, UserModel } from '../models/User';
import { StaticHelper } from './static';



export class PassportHelper {
    private ExtractJwt = passportJWT.ExtractJwt;
    private JwtStrategy = passportJWT.Strategy;

    private emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    private emailNamePattern = /^.*(?=@)/;

    private JWTStrategyOptions = {
        jwtFromRequest: this.ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET
    };

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
        passport.use(new this.JwtStrategy(
            this.JWTStrategyOptions,
            (jwt_payload, done) => {
                User.findById(jwt_payload.id).exec()
                    .then((user: UserModel) => {
                        if (user) {
                            done(null, new SendUser(user._id, user.name, user.picture));
                        } else {
                            done('Invalid JWT Token');
                        }
                    })
                    .catch(err => done(err));
            }));
    }

    // Facebook strategy
    verifyFbToken(): void {
        passport.use(new FacebookTokenStrategy(
            this.facebookTokenStrategyOptions,
            (accessToken, refreshToken, profile, done) => {
                User.findOne({'facebook': profile.id}).exec()
                    .then((user: any) => {

                        if(!user) {
                            user = new User();
                        }

                        user.email = profile._json.email;
                        user.name = `${profile.name.givenName} ${profile.name.familyName}`;
                        user.picture = `https://graph.facebook.com/${profile.id}/picture?type=large`;
                        user.facebook = profile.id;

                        user.tokens = [];
                        user.tokens.push({ kind: 'facebook', accessToken });
                        user.save(err => {
                            if (err) {
                                return done(err);
                            }

                            this.returnSendUser(user, done);
                        });
                    })
                    .catch(err => done(err));
            }));
    }

    // local strategy
    localAuth(): void {
        passport.use('local-signup', new LocalStrategy(
            this.localStrategyOptions,
            (req, email, password, done) => {

                // asynchronous
                // User.findOne wont fire unless data is sent back
                process.nextTick(() => {

                    User.findOne({ 'email' :  email }, (err, user: any) => {
                        // if there are any errors, return the error
                        if (err) {
                            return done(err);
                        }

                        // check to see if theres already a user with that email
                        if (user) {
                            return done('User with this email already exists');
                        }

                        if(!email.match(this.emailPattern)) {
                            return done('Email is wrong');
                        }

                        if(
                            password.length < this.passwordLengthRestrictions.min ||
                            password.length > this.passwordLengthRestrictions.max
                        ) {
                            return done('Invalid password length');
                        }

                        // if there is no user with that email
                        // create the user
                        const newUser: any  = new User();

                        // set the user's local credentials
                        newUser.email    = email;
                        newUser.password = newUser.generateHash(password);

                        // save the user
                        newUser.save(err => {
                            if (err) {
                                return done(err);
                            }

                            User.findOne({email}, (err, user: any) => {
                                if (err) {
                                    return done(err);
                                }

                                const newUser: any = new User();

                                newUser.generateIdenticon(user.id)
                                    .then(image => {
                                        user.picture = StaticHelper.getImagesPath(req) + image;
                                        user.name = email.match(this.emailNamePattern)[0];

                                        user.save(err => {
                                            if(err) {
                                                throw err;
                                            }

                                            this.returnSendUser(user, done);
                                        });
                                    })
                                    .catch(err => done(err));
                            });
                        });

                    });

                });
            }));
    }

    localLogin(): void {
        passport.use('local-login', new LocalStrategy(
            this.localStrategyOptions,
            (req, email, password, done) => { // callback with email and password from our form

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({ 'email' :  email }, (err, user: any) => {
                    // if there are any errors, return the error before anything else
                    if (err) {
                        return done(err);
                    }

                    // if no user is found, return the message
                    if (!user) {
                        return done('No user is found');
                    }

                    // if the user is found but the password is wrong
                    if (!user.validPassword(password)) {
                        return done('Wrong password');
                    }

                    // all is well, return successful user
                    this.returnSendUser(user, done);
                });

            }));
    }



    private returnSendUser(user, done): void {
        const payload = {id: user.id};
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        const sendUser = {user: new SendUser(user._id, user.name, user.picture), token};
        done(null, sendUser);
    }

    private setupSerializer(): void {
        passport.serializeUser<any, any>((user, done) => {
            done(undefined, user.id);
        });
    }

    private setupDeserializer(): void {
        passport.deserializeUser((id, done) => {
            User.findById(id, (err, user) => {
                done(err, user);
            });
        });
    }
}

