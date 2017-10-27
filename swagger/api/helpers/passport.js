"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const passport = require("passport");
const FacebookTokenStrategy = require("passport-facebook-token");
const jwt = require("jsonwebtoken");
const passportJWT = require("passport-jwt");
const LocalStrategy = require("passport-local");
const User_1 = require("../models/User");
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;
passport.serializeUser((user, done) => {
    done(undefined, user.id);
});
passport.deserializeUser((id, done) => {
    User_1.default.findById(id, (err, user) => {
        done(err, user);
    });
});
function verifyJWT() {
    passport.use(new JwtStrategy({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET
    }, function (jwt_payload, done) {
        User_1.default.findById(jwt_payload.id).exec()
            .then((user) => {
            if (user) {
                done(null, new User_1.SendUser(user._id, user.name, user.picture));
            }
            else {
                done('Invalid JWT Token');
            }
        })
            .catch(err => done(err));
    }));
}
exports.verifyJWT = verifyJWT;
// Facebook strategy
function verifyFbToken() {
    passport.use(new FacebookTokenStrategy({
        clientID: process.env.FACEBOOK_ID,
        clientSecret: process.env.FACEBOOK_SECRET
    }, function (accessToken, refreshToken, profile, done) {
        User_1.default.findOne({ 'facebook': profile.id }).exec()
            .then((user) => {
            if (!user) {
                user = new User_1.default();
            }
            user.email = profile._json.email;
            user.name = `${profile.name.givenName} ${profile.name.familyName}`;
            user.picture = `https://graph.facebook.com/${profile.id}/picture?type=large`;
            user.facebook = profile.id;
            // TODO: don't set tokens as an empty array when we will have more auth methods
            user.tokens = [];
            user.tokens.push({ kind: 'facebook', accessToken });
            user.save((err) => {
                const payload = { id: user.id };
                const token = jwt.sign(payload, process.env.JWT_SECRET);
                done(null, { user: new User_1.SendUser(user.id, user.name, user.picture), token });
            });
        })
            .catch(err => done(err));
    }));
}
exports.verifyFbToken = verifyFbToken;
// local strategy
function localAuth() {
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    }, function (req, email, password, done) {
        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function () {
            User_1.default.findOne({ 'email': email }, function (err, user) {
                // if there are any errors, return the error
                if (err) {
                    return done(err);
                }
                // check to see if theres already a user with that email
                if (user) {
                    return done('User with this email already exists');
                }
                const emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if (!email.match(emailPattern)) {
                    return done('Email is wrong');
                }
                if (password.length < 6 || password.length > 20) {
                    return done('Invalid password length');
                }
                // if there is no user with that email
                // create the user
                const newUser = new User_1.default();
                // set the user's local credentials
                newUser.email = email;
                newUser.password = newUser.generateHash(password);
                // save the user
                newUser.save(function (err) {
                    if (err)
                        throw err;
                    User_1.default.findOne({ email: email }, (err, user) => {
                        if (err) {
                            return done(err);
                        }
                        const newUser = new User_1.default();
                        newUser.generateIdenticon(user.id)
                            .then(image => {
                            user.picture = req.protocol + '://' + req.get('host') + '/images/' + image;
                            user.name = email.match(/^.*(?=@)/)[0];
                            user.save(function (err) {
                                if (err) {
                                    throw err;
                                }
                                const payload = { id: user.id };
                                const token = jwt.sign(payload, process.env.JWT_SECRET);
                                return done(null, { user: new User_1.SendUser(user._id, user.name, user.picture), token });
                            });
                        })
                            .catch(err => done(err));
                    });
                });
            });
        });
    }));
}
exports.localAuth = localAuth;
function localLogin() {
    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    }, function (req, email, password, done) {
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User_1.default.findOne({ 'email': email }, function (err, user) {
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
            const payload = { id: user.id };
            const token = jwt.sign(payload, process.env.JWT_SECRET);
            return done(null, { user: new User_1.SendUser(user._id, user.name, user.picture), token });
        });
    }));
}
exports.localLogin = localLogin;
//# sourceMappingURL=passport.js.map