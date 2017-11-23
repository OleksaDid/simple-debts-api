"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
const FacebookTokenStrategy = require("passport-facebook-token");
const jwt = require("jsonwebtoken");
const passportJWT = require("passport-jwt");
const LocalStrategy = require("passport-local");
const constants_1 = require("../../common/constants");
const user_schema_1 = require("../users/user.schema");
const user_dto_1 = require("../users/user.dto");
const get_images_path_service_1 = require("../../services/get-images-path.service");
class AuthenticationService {
    constructor() {
        this.ExtractJwt = passportJWT.ExtractJwt;
        this.JwtStrategy = passportJWT.Strategy;
        this.JWTStrategyOptions = {
            jwtFromRequest: this.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET,
            ignoreExpiration: true
        };
        this.RefreshTokenStrategyOptions = Object.assign({}, this.JWTStrategyOptions, {
            secretOrKey: process.env.REFRESH_JWT_SECRET
        });
        this.localStrategyOptions = {
            // by default, local strategy uses username and password, we will override with email
            usernameField: 'email',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        };
        this.facebookTokenStrategyOptions = {
            clientID: process.env.FACEBOOK_ID,
            clientSecret: process.env.FACEBOOK_SECRET
        };
        this.passwordLengthRestrictions = {
            min: 6,
            max: 20
        };
        this.setupSerializer();
        this.setupDeserializer();
    }
    verifyJWT() {
        passport.use('jwt', new this.JwtStrategy(this.JWTStrategyOptions, (jwt_payload, done) => {
            console.log(jwt_payload);
            if (jwt_payload.exp < this.getCurrentDateInSeconds()) {
                return done(new Error('Access Token Expired'));
            }
            user_schema_1.default
                .findById(jwt_payload.id)
                .lean()
                .then((user) => {
                if (!user || user.accessTokenId !== jwt_payload.jwtid) {
                    throw new Error('Invalid Token');
                }
                done(null, new user_dto_1.SendUserDto(user._id, user.name, user.picture));
            })
                .catch(err => done(err));
        }));
    }
    refreshToken() {
        passport.use('refresh-jwt', new this.JwtStrategy(this.RefreshTokenStrategyOptions, (jwt_payload, done) => {
            console.log(jwt_payload);
            if (jwt_payload.exp < this.getCurrentDateInSeconds()) {
                return done(new Error('Refresh Token Expired'));
            }
            user_schema_1.default
                .findById(jwt_payload.id)
                .lean()
                .then((user) => {
                if (!user || user.refreshTokenId !== jwt_payload.jwtid) {
                    throw new Error('Invalid Token');
                }
                return this.updateTokensAndReturnUser(user, done);
            })
                .catch(err => done(err));
        }));
    }
    // Facebook strategy
    verifyFbToken() {
        passport.use(new FacebookTokenStrategy(this.facebookTokenStrategyOptions, (accessToken, refreshToken, profile, done) => {
            user_schema_1.default
                .findOne({ 'facebook': profile.id })
                .exec()
                .then((user) => {
                if (!user) {
                    user = new user_schema_1.default();
                }
                user.email = profile._json.email;
                user.name = `${profile.name.givenName} ${profile.name.familyName}`;
                user.picture = this.generateFbImagePath(profile.id);
                user.facebook = profile.id;
                return user.save();
            })
                .then((user) => this.updateTokensAndReturnUser(user, done))
                .catch(err => done(err));
        }));
    }
    // local strategy
    localAuth() {
        passport.use('local-signup', new LocalStrategy(this.localStrategyOptions, (req, email, password, done) => {
            let createdUser;
            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(() => {
                user_schema_1.default.findOne({ 'email': email })
                    .then((user) => {
                    // check to see if theres already a user with that email
                    if (user) {
                        throw new Error('User with this email already exists');
                    }
                    if (!email.match(constants_1.EMAIL_PATTERN)) {
                        throw new Error('Email is wrong');
                    }
                    if (password.length < this.passwordLengthRestrictions.min ||
                        password.length > this.passwordLengthRestrictions.max) {
                        throw new Error('Invalid password length');
                    }
                    // if there is no user with that email
                    // create the user
                    const newUser = new user_schema_1.default();
                    // set the user's local credentials
                    newUser.email = email;
                    newUser.password = newUser.generateHash(password);
                    // save the user
                    return newUser.save();
                })
                    .then(() => user_schema_1.default.findOne({ email }))
                    .then((user) => {
                    const newUser = new user_schema_1.default();
                    createdUser = user;
                    return newUser.generateIdenticon(user.id);
                })
                    .then(image => {
                    createdUser.picture = get_images_path_service_1.getImagesPath(req) + image;
                    createdUser.name = email.match(constants_1.EMAIL_NAME_PATTERN)[0];
                    return createdUser.save();
                })
                    .then(() => this.updateTokensAndReturnUser(createdUser, done))
                    .catch(err => done(err));
            });
        }));
    }
    localLogin() {
        passport.use('local-login', new LocalStrategy(this.localStrategyOptions, (req, email, password, done) => {
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            user_schema_1.default.findOne({ 'email': email })
                .then((user) => {
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
    updateTokensAndReturnUser(user, done) {
        const expirationTime = Math.floor(this.getCurrentDateInSeconds()) + constants_1.ACCESS_TOKEN_EXP_SECONDS;
        const refreshExpirationTime = Math.floor(this.getCurrentDateInSeconds()) + constants_1.REFRESH_TOKEN_EXP_SECONDS;
        const payload = this.getJWTPayload(user._id, expirationTime);
        const refreshPayload = this.getJWTPayload(user._id, refreshExpirationTime);
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        const refreshToken = jwt.sign(refreshPayload, process.env.REFRESH_JWT_SECRET);
        const sendUser = {
            user: new user_dto_1.SendUserDto(user._id, user.name, user.picture),
            token,
            refreshToken
        };
        user_schema_1.default
            .findByIdAndUpdate(user._id, {
            accessTokenId: payload.jwtid,
            refreshTokenId: refreshPayload.jwtid
        })
            .then(() => done(null, sendUser));
    }
    setupSerializer() {
        passport.serializeUser((user, done) => {
            done(undefined, user.id);
        });
    }
    getJWTPayload(id, exp) {
        return {
            id,
            exp,
            jwtid: Math.ceil(Math.random() * 10000)
        };
    }
    getCurrentDateInSeconds() {
        const MS_IN_S = 1000;
        return Date.now() / MS_IN_S;
    }
    setupDeserializer() {
        passport.deserializeUser((id, done) => {
            user_schema_1.default.findById(id, (err, user) => {
                done(err, user);
            });
        });
    }
    generateFbImagePath(profileId) {
        return `https://graph.facebook.com/${profileId}/picture?type=large`;
    }
}
exports.AuthenticationService = AuthenticationService;
//# sourceMappingURL=authentication.service.js.map