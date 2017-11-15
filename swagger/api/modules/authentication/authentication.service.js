"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
const FacebookTokenStrategy = require("passport-facebook-token");
const jwt = require("jsonwebtoken");
const passportJWT = require("passport-jwt");
const LocalStrategy = require("passport-local");
const constants_1 = require("../../common/constants");
const user_schema_1 = require("../users/user.schema");
const user_interface_1 = require("../users/user.interface");
const user_dto_1 = require("../users/user.dto");
const get_images_path_service_1 = require("../../services/get-images-path.service");
class AuthenticationService {
    constructor() {
        this.ExtractJwt = passportJWT.ExtractJwt;
        this.JwtStrategy = passportJWT.Strategy;
        this.JWTStrategyOptions = {
            jwtFromRequest: this.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET
        };
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
        passport.use(new this.JwtStrategy(this.JWTStrategyOptions, (jwt_payload, done) => {
            user_schema_1.default
                .findById(jwt_payload.id)
                .exec()
                .then((user) => {
                if (user) {
                    done(null, new user_dto_1.SendUserDto(user._id, user.name, user.picture));
                }
                else {
                    done('Invalid JWT Token');
                }
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
                user.tokens = [];
                user.tokens.push({ kind: user_interface_1.UserTokenKinds.Facebook, accessToken });
                return user.save();
            })
                .then((user) => this.returnSendUser(user, done))
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
                        throw 'User with this email already exists';
                    }
                    if (!email.match(constants_1.EMAIL_PATTERN)) {
                        throw 'Email is wrong';
                    }
                    if (password.length < this.passwordLengthRestrictions.min ||
                        password.length > this.passwordLengthRestrictions.max) {
                        throw 'Invalid password length';
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
                    .then(() => this.returnSendUser(createdUser, done))
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
    returnSendUser(user, done) {
        const payload = { id: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET);
        const sendUser = { user: new user_dto_1.SendUserDto(user._id, user.name, user.picture), token };
        done(null, sendUser);
    }
    setupSerializer() {
        passport.serializeUser((user, done) => {
            done(undefined, user.id);
        });
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