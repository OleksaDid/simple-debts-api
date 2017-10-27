import * as passport from 'passport';
import * as FacebookTokenStrategy from 'passport-facebook-token';
import * as jwt from 'jsonwebtoken';
import * as passportJWT from 'passport-jwt';
import * as _ from 'lodash';
import * as LocalStrategy from 'passport-local';

import { default as User, SendUser, UserModel } from '../models/User';
import { Request, Response, NextFunction } from 'express';

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;



passport.serializeUser<any, any>((user, done) => {
  done(undefined, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

export function verifyJWT() {
    passport.use(new JwtStrategy({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET
        },
        function(jwt_payload, done) {
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
export function verifyFbToken() {
  passport.use(new FacebookTokenStrategy({
        clientID: process.env.FACEBOOK_ID,
        clientSecret: process.env.FACEBOOK_SECRET
      },
      function(accessToken, refreshToken, profile, done) {
        User.findOne({'facebook': profile.id}).exec()
            .then((user: any) => {

             if(!user) {
                 user = new User();
             }

              user.email = profile._json.email;
              user.name = `${profile.name.givenName} ${profile.name.familyName}`;
              user.picture = `https://graph.facebook.com/${profile.id}/picture?type=large`;
              user.facebook = profile.id;
              // TODO: don't set tokens as an empty array when we will have more auth methods
              user.tokens = [];
              user.tokens.push({ kind: 'facebook', accessToken });
              user.save((err: Error) => {
                  const payload = {id: user.id};
                  const token = jwt.sign(payload, process.env.JWT_SECRET);
                  done(null, {user: new SendUser(user.id, user.name, user.picture), token});
              });
            })
            .catch(err => done(err));
      }));
}

// local strategy
export function localAuth() {
    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) {

            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function() {

                User.findOne({ 'email' :  email }, function(err, user: any) {
                    // if there are any errors, return the error
                    if (err) {
                        return done(err);
                    }

                    // check to see if theres already a user with that email
                    if (user) {
                        return done('User with this email already exists');
                    }

                    const emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

                    if(!email.match(emailPattern)) {
                        return done('Email is wrong');
                    }

                    if(password.length < 6 || password.length > 20) {
                        return done('Invalid password length');
                    }

                    // if there is no user with that email
                    // create the user
                    const newUser: any  = new User();

                    // set the user's local credentials
                    newUser.email    = email;
                    newUser.password = newUser.generateHash(password);

                    // save the user
                    newUser.save(function(err) {
                        if (err)
                            throw err;

                        User.findOne({email: email}, (err, user: any) => {
                            if (err) {
                                return done(err);
                            }

                            const newUser: any = new User();

                            newUser.generateIdenticon(user.id)
                                .then(image => {
                                    user.picture = req.protocol + '://' + req.get('host') + '/images/' + image;
                                    user.name = email.match(/^.*(?=@)/)[0];

                                    user.save(function(err) {
                                        if(err) {
                                            throw err;
                                        }

                                        const payload = {id: user.id};
                                        const token = jwt.sign(payload, process.env.JWT_SECRET);
                                        return done(null, {user: new SendUser(user._id, user.name, user.picture), token});
                                    });
                                })
                                .catch(err => done(err));
                        });
                    });

                });

            });
        }));
}

export function localLogin() {
    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            User.findOne({ 'email' :  email }, function(err, user: any) {
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
                const payload = {id: user.id};
                const token = jwt.sign(payload, process.env.JWT_SECRET);
                return done(null, {user: new SendUser(user._id, user.name, user.picture), token});
            });

        }));
}

