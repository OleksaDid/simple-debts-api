import * as crypto from 'crypto';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt-nodejs';
import * as fs from 'fs';
import * as Identicon from 'identicon.js';

export type UserModel = mongoose.Document & {
  email: string,
  password: string,
  resetPasswordToken: String,
  resetPasswordTokenExpires: Date,
  name: string,
  picture: string

  facebook: string,
  tokens: AuthToken[],

  gravatar: (size: number) => string
};

export class SendUser {
  id: string;
  name: string;
  picture: string;

  constructor(id: string, name: string, picture: string) {
    this.id = id;
    this.name = name;
    this.picture = picture;
  }
}

export type AuthToken = {
  accessToken: string,
  kind: string
};

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
userSchema.methods.gravatar = function (size: number) {
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
userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.methods.generateIdenticon = (hashSubject) => {
    const identiconOptions = {
        background: [255, 255, 255, 255],         // rgba white
        margin: 0.2,                              // 20% margin
        size: 200
    };
    const imgBase64 = new Identicon(hashSubject, identiconOptions).toString();
    const fileName = hashSubject + '.png';

    return new Promise((resolve, reject) => {
      fs.writeFile('public/images/' + fileName, new Buffer(imgBase64, 'base64'), (err) => {
        if (err) reject(err);
        else resolve(fileName);
      });
    });
};

const User = mongoose.model('User', userSchema);
export default User;