import * as bcrypt from 'bcrypt-nodejs';
import * as fs from 'fs';
import * as Identicon from 'identicon.js';
import { model } from 'mongoose';
import Schema from '../../services/custom-mongoose-types.service';


const userSchema = new Schema({
    email: { type: String, index: true, unique: true, sparse: true },
    name: String,
    picture: String,
    password: String,

    virtual: {type: Boolean, default: false},

    facebook: { type: String, index: true, unique: true, sparse: true },

    refreshTokenId: Number,
    accessTokenId: Number,

}, { timestamps: true });

// generating a hash
userSchema.methods.generateHash = (password: string) => bcrypt.hashSync(password, bcrypt.genSaltSync(8));

// checking if password is valid
userSchema.methods.validPassword = function(password: string) {
    return bcrypt.compareSync(password, this.password);
};

// create picture, save it in public folder & return public link
userSchema.methods.generateIdenticon = (hashSubject) => {
    const identiconOptions = {
        background: [255, 255, 255, 255],         // rgba white
        margin: 0.2,                              // 20% margin
        size: 200
    };
    const imgBase64 = new Identicon(hashSubject, identiconOptions).toString();
    const fileName = hashSubject + '.png';

    return new Promise((resolve, reject) => {
        fs.writeFile(
            'public/images/' + fileName,
            new Buffer(imgBase64, 'base64'),
            err => {
                if (err) reject(err);
                else resolve(fileName);
            });
    });
};



const User = model('User', userSchema);
export default User;