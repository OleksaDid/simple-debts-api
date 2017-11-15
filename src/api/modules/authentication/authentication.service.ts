import * as passport from 'passport';
import * as FacebookTokenStrategy from 'passport-facebook-token';
import * as jwt from 'jsonwebtoken';
import * as passportJWT from 'passport-jwt';
import * as LocalStrategy from 'passport-local';

import { EMAIL_NAME_PATTERN, EMAIL_PATTERN } from '../../common/constants';
import User from '../users/user.schema';
import { UserInterface, UserTokenKinds } from '../users/user.interface';
import { SendUserDto } from '../users/user.dto';
import { getImagesPath } from '../../services/get-images-path.service';



export class AuthenticationService {
    private ExtractJwt = passportJWT.ExtractJwt;
    private JwtStrategy = passportJWT.Strategy;

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
                User
                    .findById(jwt_payload.id)
                    .exec()
                    .then((user: UserInterface) => {
                        if (user) {
                            done(null, new SendUserDto(user._id, user.name, user.picture));
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

                        user.tokens = [];
                        user.tokens.push({ kind: UserTokenKinds.Facebook, accessToken });
                        
                        return user.save();
                    })
                    .then((user: UserInterface) => this.returnSendUser(user, done))
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
                                throw 'User with this email already exists';
                            }

                            if(!email.match(EMAIL_PATTERN)) {
                                throw 'Email is wrong';
                            }

                            if(
                                password.length < this.passwordLengthRestrictions.min ||
                                password.length > this.passwordLengthRestrictions.max
                            ) {
                                throw 'Invalid password length';
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
                        .then(() => this.returnSendUser(createdUser, done))
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
                            throw 'No user is found';
                        }

                        // if the user is found but the password is wrong
                        if (!user.validPassword(password)) {
                            throw 'Wrong password';
                        }

                        // all is well, return successful user
                        return this.returnSendUser(user, done);
                    })
                    .catch(err => done(err));

            }));
    }



    private returnSendUser(user: UserInterface, done): void {
        const payload = {id: user.id};
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        const sendUser = {user: new SendUserDto(user._id, user.name, user.picture), token};
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
    
    private generateFbImagePath(profileId): string {
        return `https://graph.facebook.com/${profileId}/picture?type=large`;
    }
}

