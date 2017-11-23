"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = require("bcrypt-nodejs");
const fs = require("fs");
const Identicon = require("identicon.js");
const mongoose_1 = require("mongoose");
const custom_mongoose_types_service_1 = require("../../services/custom-mongoose-types.service");
const userSchema = new custom_mongoose_types_service_1.default({
    email: { type: String, index: true, unique: true, sparse: true },
    name: String,
    picture: String,
    password: String,
    virtual: { type: Boolean, default: false },
    facebook: { type: String, index: true, unique: true, sparse: true },
    refreshTokenId: Number,
    accessTokenId: Number,
}, { timestamps: true });
// generating a hash
userSchema.methods.generateHash = (password) => bcrypt.hashSync(password, bcrypt.genSaltSync(8));
// checking if password is valid
userSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};
// create picture, save it in public folder & return public link
userSchema.methods.generateIdenticon = (hashSubject) => {
    const identiconOptions = {
        background: [255, 255, 255, 255],
        margin: 0.2,
        size: 200
    };
    const imgBase64 = new Identicon(hashSubject, identiconOptions).toString();
    const fileName = hashSubject + '.png';
    return new Promise((resolve, reject) => {
        fs.writeFile('public/images/' + fileName, new Buffer(imgBase64, 'base64'), err => {
            if (err)
                reject(err);
            else
                resolve(fileName);
        });
    });
};
const User = mongoose_1.model('User', userSchema);
exports.default = User;
//# sourceMappingURL=user.schema.js.map