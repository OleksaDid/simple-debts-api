"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const fs = require("fs");
const Identicon = require("identicon.js");
class SendUser {
    constructor(id, name, picture) {
        this.id = id;
        this.name = name;
        this.picture = picture;
    }
}
exports.SendUser = SendUser;
const userSchema = new mongoose.Schema({
    email: { type: String, index: true, unique: true, sparse: true },
    name: String,
    picture: String,
    password: String,
    resetPasswordToken: String,
    resetPasswordTokenExpires: Date,
    facebook: { type: String, index: true, unique: true, sparse: true },
    tokens: Array
}, { timestamps: true });
/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function (size) {
    if (!size) {
        size = 200;
    }
    if (!this.email) {
        return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash('md5').update(this.email).digest('hex');
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};
// generating a hash
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
};
// checking if password is valid
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};
userSchema.methods.generateIdenticon = (hashSubject) => {
    const identiconOptions = {
        background: [255, 255, 255, 255],
        margin: 0.2,
        size: 200
    };
    const imgBase64 = new Identicon(hashSubject, identiconOptions).toString();
    const fileName = hashSubject + '.png';
    return new Promise((resolve, reject) => {
        fs.writeFile('public/images/' + fileName, new Buffer(imgBase64, 'base64'), (err) => {
            if (err)
                reject(err);
            else
                resolve(fileName);
        });
    });
};
const User = mongoose.model('User', userSchema);
exports.default = User;
//# sourceMappingURL=User.js.map