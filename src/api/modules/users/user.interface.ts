import { Document } from 'mongoose';

export interface UserInterface extends Document {
    email: string;
    name: string;
    picture: string;
    password: string;

    virtual: boolean;

    facebook: string;
    tokens: UserToken[];

    generateHash: (password: string) => string;
    validPassword: (password: string) => boolean;
    generateIdenticon: (hashSubject: string) => Promise<string>;
}

export interface UserToken {
    kind: UserTokenKinds;
    accessToken: string;
}

export enum UserTokenKinds {
    Facebook = 'facebook'
}