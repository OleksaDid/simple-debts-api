import { Id } from './types';

export class ValidationObject {
    errors: any;
    userId: Id;


    constructor(errors: any,  userId: Id) {
        this.errors = errors;
        this.userId = userId;
    }
}
