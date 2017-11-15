import * as mongoose from 'mongoose';
import * as fs from 'fs';
import {App} from "../src/app";
import {DebtDto} from "../src/api/modules/debts/debt.dto";
import {DebtsAccountType} from "../src/api/modules/debts/debt.interface";
import User from "../src/api/modules/users/user.schema";
import Debts from "../src/api/modules/debts/debt.schema";

const request = require('supertest');
const app = new App().application;


const credentials = {
    email: 'real_avatarr12@mail.ru',
    password: 'a998877'
};

const credentialsThird = {
    email:"hleb@ssdemail.com",
    password: "hdhdjigo"
};

const fbToken = 'EAAJV6d1AA6ABAJHo5lH4Os7muF06jbbWtqTjryqGDtWp4YAoHD5CKzecvxODmUdCz8HgYM7gwc37iZBZB4ZBbTN713crYEjCBMbZBSf45frhppjHufFJyeanPbjPNldPrgnMDHA4Gv0gkNoZAs6rDPTQ2x9ZCUX4iTIrUu3ORHKXiyQkip6ZBVASadurdUtB5Bm3SMQyafhZCsrrI1AyacxGZCP7P7IoUZBYcZD';

let token = '';
let user;
let anotherUserToken = '';
let anotherUser;
let thirdUser;
let thirdUserToken;

let singleDebt;
let multipleDebt;
let connectUserDebt;

let connectUserDebtVirtualUser;


beforeAll((done) => {

    const promises = [];

    promises.push(
        request(app)
            .get('/login/facebook')
            .set('Authorization', 'Bearer ' + fbToken)
    );

    promises.push(
        request(app)
            .post('/login/local')
            .send(credentials)
    );

    promises.push(
        request(app)
            .post('/login/local')
            .send(credentialsThird)
    );

    promises.push(
        mongoose.connection.collections['debts'].drop()
    );


    return Promise.all(promises)
        .then(responses => {
            anotherUserToken = responses[0].body.token;
            anotherUser = responses[0].body.user;

            token = responses[1].body.token;
            user = responses[1].body.user;

            thirdUserToken = responses[2].body.token;
            thirdUser = responses[2].body.user;

            done();
        });
});

describe('PUT /debts', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).put('/debts').send({userId: anotherUser.id, countryCode: 'UA'}));
        promises.push(request(app).put('/debts').send({userId: anotherUser.id, countryCode: 'UA'}).set('Authorization', 'Bearer '));
        promises.push(request(app).put('/debts').send({userId: anotherUser.id, countryCode: 'UA'}).set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should throw an error if you try to create debts w/ yourself', () => {
        return request(app)
            .put('/debts')
            .send({userId: user.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error', 'You cannot create Debts with yourself');
            });
    });

    it('should throw an error if you try to create debts w/ invalid user', () => {
        const promises = [];
        const users = ['', 'kjlhgf6789'];

        users.forEach(user => {
            promises.push(
                request(app)
                    .put('/debts')
                    .send({userId: user, countryCode: 'UA'})
                    .set('Authorization', 'Bearer ' + token)
            );
        });

        return Promise.all(promises)
            .then(responses => {
                responses.forEach(resp => {
                    expect(resp.statusCode).toBe(400);
                });
            });
    });

    it('should throw an error if you try to create debts w/ invalid country code', () => {
        const promises = [];
        const codes = ['UAH', '', 'A'];

        codes.forEach(code => {
            promises.push(
                request(app)
                    .put('/debts')
                    .send({userId: anotherUser.id, countryCode: code})
                    .set('Authorization', 'Bearer ' + token)
            );
        });

        return Promise.all(promises)
            .then(responses => {
                responses.forEach(resp => {
                    expect(resp.statusCode).toBe(400);
                });
            });
    });

    it('should return new created Debts object', () => {
        return request(app)
            .put('/debts')
            .send({userId: anotherUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(debt => {
                const expectedDebts: any = new DebtDto(
                    user.id,
                    anotherUser.id,
                    DebtsAccountType.MULTIPLE_USERS,
                    'UA'
                );

                expectedDebts.user = anotherUser;
                delete expectedDebts.users;

                multipleDebt = debt.body;

                checkIsObjectMatchesDebtsModel(debt.body, expectedDebts);
            });
    });

    it('should throw an error if debts between these users already exists', () => {
        return request(app)
            .put('/debts')
            .send({userId: anotherUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error', 'Such debts object is already created');
            });
    });
});



describe('PUT /debts/single', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).put('/debts/single').send({userName: 'Valera', countryCode: 'UA'}));
        promises.push(request(app).put('/debts/single').send({userName: 'Valera', countryCode: 'UA'}).set('Authorization', 'Bearer '));
        promises.push(request(app).put('/debts/single').send({userName: 'Valera', countryCode: 'UA'}).set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should throw an error if you try to create debts w/ invalid country code', () => {
        const promises = [];
        const codes = ['UAH', '', 'A'];

        codes.forEach(code => {
            promises.push(
                request(app)
                    .put('/debts/single')
                    .send({userName: 'Valera', countryCode: code})
                    .set('Authorization', 'Bearer ' + token)
            );
        });

        return Promise.all(promises)
            .then(responses => {
                responses.forEach(resp => {
                    expect(resp.statusCode).toBe(400);
                });
            });
    });

    it('should throw an error if you try to create debts w/ invalid username', () => {
        return request(app)
            .put('/debts/single')
            .send({userName: '', countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should create new user & return new created Debts object', () => {
        return request(app)
            .put('/debts/single')
            .send({userName: 'Valera', countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(debt => {
                const expectedDebts: any = new DebtDto(
                    user.id,
                    anotherUser.id,
                    DebtsAccountType.SINGLE_USER,
                    'UA'
                );

                expectedDebts.user = {
                    name: 'Valera'
                };
                delete expectedDebts.users;

                singleDebt = JSON.parse(JSON.stringify(debt.body));

                expect(debt.body.user).toHaveProperty('id');
                expect(debt.body.user).toHaveProperty('picture');

                delete debt.body.user.id;
                delete debt.body.user.picture;

                checkIsObjectMatchesDebtsModel(debt.body, expectedDebts);

                return User.findById(singleDebt.user.id).lean();
            })
            .then(user => {
                expect(user).toHaveProperty('virtual');
                expect(user.virtual).toBeTruthy();
            });
    });

    it('should throw an error if there is already virtual user w/ such name', () => {
        return request(app)
            .put('/debts/single')
            .send({userName: 'Valera', countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error', 'You already have virtual user with such name');
            });
    });
});


describe('GET /debts', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).get('/debts'));
        promises.push(request(app).get('/debts').set('Authorization', 'Bearer '));
        promises.push(request(app).get('/debts').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });


    it('should return all created Debts and summary', () => {
        return request(app)
            .get('/debts')
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(resp => {
                const debts = resp.body;
                const debtsModel: any = new DebtDto(
                    user.id,
                    anotherUser.id,
                    DebtsAccountType.MULTIPLE_USERS,
                    'UA'
                );

                debtsModel.user = {
                    id: '435tyeh',
                    name: 'Valera',
                    picture: 'vjhgtyt78'
                };
                delete debtsModel.users;
                delete debtsModel.moneyOperations;

                expect(debts).toHaveProperty('debts');
                expect(Array.isArray(debts.debts)).toBeTruthy();

                debts.debts.forEach(debt => {
                    checkIsObjectMatchesDebtsModel(debt, debtsModel, false);
                });

                expect(debts).toHaveProperty('summary');
                expect(debts.summary).toHaveProperty('toGive', 0);
                expect(debts.summary).toHaveProperty('toTake', 0);
            });
    });
});


describe('GET /debts/:id', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).get('/debts/' + multipleDebt.id));
        promises.push(request(app).get('/debts/' + multipleDebt.id).set('Authorization', 'Bearer '));
        promises.push(request(app).get('/debts/' + multipleDebt.id).set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '/',
            null,
            undefined
        ];

        params.forEach(param => {
            promises.push(request(app).get('/debts/' + param).set('Authorization', 'Bearer ' + token));
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .get('/debts/' + 'pj2i4hui3gyfu')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return debt by id', () => {
        return request(app)
            .get('/debts/' + multipleDebt.id)
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(resp => {
                checkIsObjectMatchesDebtsModel(resp.body, multipleDebt);
            });
    });
});


describe('DELETE /debts/:id (single)', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).delete('/debts/' + singleDebt.id));
        promises.push(request(app).delete('/debts/' + singleDebt.id).set('Authorization', 'Bearer '));
        promises.push(request(app).delete('/debts/' + singleDebt.id).set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            null,
            undefined
        ];

        params.forEach(param => {
           promises.push(request(app).delete('/debts/' + param).set('Authorization', 'Bearer ' + token));
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .delete('/debts/' + 'pj2i4hui3gyfu')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
               expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return all debts', () => {

        return request(app)
            .delete('/debts/' + singleDebt.id)
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(resp => {
                const debts = resp.body;
                const debtsModel: any = new DebtDto(
                    user.id,
                    anotherUser.id,
                    DebtsAccountType.MULTIPLE_USERS,
                    'UA'
                );

                debtsModel.user = {
                    id: '435tyeh',
                    name: 'Valera',
                    picture: 'vjhgtyt78'
                };
                delete debtsModel.users;
                delete debtsModel.moneyOperations;

                expect(debts).toHaveProperty('debts');
                expect(Array.isArray(debts.debts)).toBeTruthy();

                debts.debts.forEach(debt => {
                    checkIsObjectMatchesDebtsModel(debt, debtsModel, false);
                });

                expect(debts).toHaveProperty('summary');
                expect(debts.summary).toHaveProperty('toGive', 0);
                expect(debts.summary).toHaveProperty('toTake', 0);
            });
    });

    it('should remove debt from db', () => {
        return Debts
            .findById(singleDebt.id)
            .then(resp => {
                expect(resp).toBe(null);
            });
    });

    it('should remove virtual user from db', () => {
        return User
            .findById(singleDebt.user.id)
            .then(resp => {
                expect(resp).toBe(null);
            });
    });

    it('should remove virtual user\'s image from server', (done) => {
        fs.exists('public/images/' + singleDebt.user.picture.match(/[^\/]*$/), (exists) => {
            expect(exists).toBe(false);
            done();
        });
    });
});


describe('POST /debts/:id/creation', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).post('/debts/' + multipleDebt.id + '/creation'));
        promises.push(request(app).post('/debts/' + multipleDebt.id + '/creation').set('Authorization', 'Bearer '));
        promises.push(request(app).post('/debts/' + multipleDebt.id + '/creation').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            null,
            undefined
        ];

        params.forEach(param => {
            promises.push(request(app).post('/debts/' + param + '/creation').set('Authorization', 'Bearer ' + token));
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .post('/debts/' + 'y34ygv4h3' + '/creation')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return an error if not statusAcceptor tries to accept debts', () => {

        return request(app)
            .post('/debts/' + multipleDebt.id + '/creation')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return all debts & change status of debtId from \'CREATION_AWAITING\' to \'UNCHANGED\' & change statusAcceptor to null', () => {
        expect(multipleDebt.status).toBe('CREATION_AWAITING');

        return request(app)
            .post('/debts/' + multipleDebt.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(200)
            .then(resp => {
                const debts = resp.body;
                const unchangedDebt = JSON.parse(JSON.stringify(multipleDebt));
                unchangedDebt.status = 'UNCHANGED';
                unchangedDebt.statusAcceptor = null;
                unchangedDebt.user = user;
                delete unchangedDebt.moneyOperations;

                expect(debts).toHaveProperty('debts');
                expect(Array.isArray(debts.debts)).toBeTruthy();
                debts.debts.forEach(debt => checkIsObjectMatchesDebtsModel(debt, unchangedDebt, false));

                expect(debts).toHaveProperty('summary');
                expect(debts.summary).toHaveProperty('toGive', 0);
                expect(debts.summary).toHaveProperty('toTake', 0);

                expect(debts.debts.find(debt => debt.id === unchangedDebt.id)).toBeTruthy();
                checkIsObjectMatchesDebtsModel(debts.debts.find(debt => debt.id === unchangedDebt.id), unchangedDebt);
            });
    });

    it('should return an error if debts is already accepted/declined', () => {
        return request(app)
            .post('/debts/' + multipleDebt.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error', 'Debts not found');
            });
    });
});


describe('DELETE /debts/:id/creation', () => {

    beforeAll((done) => {
        Debts.findByIdAndRemove(multipleDebt.id)
            .then(() => {
                return request(app)
                    .put('/debts')
                    .send({userId: anotherUser.id, countryCode: 'UA'})
                    .set('Authorization', 'Bearer ' + token);
            })
            .then((resp) => {
                multipleDebt = resp.body;
                done();
            });
    });

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).delete('/debts/' + multipleDebt.id + '/creation'));
        promises.push(request(app).delete('/debts/' + multipleDebt.id + '/creation').set('Authorization', 'Bearer '));
        promises.push(request(app).delete('/debts/' + multipleDebt.id + '/creation').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            null,
            undefined
        ];

        params.forEach(param => {
            promises.push(request(app).delete('/debts/' + param + '/creation').set('Authorization', 'Bearer ' + token));
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .delete('/debts/' + 'y34ygv4h3' + '/creation')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return all debts', () => {
        expect(multipleDebt.status).toBe('CREATION_AWAITING');

        return request(app)
            .delete('/debts/' + multipleDebt.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(200)
            .then(resp => {
                const debts = resp.body;
                const unchangedDebt = JSON.parse(JSON.stringify(multipleDebt));
                unchangedDebt.status = 'UNCHANGED';
                unchangedDebt.statusAcceptor = null;
                unchangedDebt.user = user;
                delete unchangedDebt.moneyOperations;

                expect(debts).toHaveProperty('debts');
                expect(Array.isArray(debts.debts)).toBeTruthy();
                debts.debts.forEach(debt => checkIsObjectMatchesDebtsModel(debt, unchangedDebt, false));

                expect(debts).toHaveProperty('summary');
                expect(debts.summary).toHaveProperty('toGive', 0);
                expect(debts.summary).toHaveProperty('toTake', 0);
            });
    });

    it('should return an error if debts is already accepted/declined', () => {
        return request(app)
            .delete('/debts/' + multipleDebt.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error', 'Debts not found');
            });
    });

    it('should delete debt from db', () => {
        return Debts.findById(multipleDebt.id)
            .then((resp) => expect(resp).not.toBeTruthy());
    });

    it('can be deleted by user who\'s created Debts', () => {
        return request(app)
            .put('/debts')
            .send({userId: anotherUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(resp => multipleDebt = resp.body)
            .then(() => request(app)
                .delete('/debts/' + multipleDebt.id + '/creation')
                .set('Authorization', 'Bearer ' + token)
                .expect(200))
            .then(resp => {
                const debts = resp.body;
                const unchangedDebt = JSON.parse(JSON.stringify(multipleDebt));
                unchangedDebt.status = 'UNCHANGED';
                unchangedDebt.statusAcceptor = null;
                unchangedDebt.user = user;
                delete unchangedDebt.moneyOperations;

                expect(debts).toHaveProperty('debts');
                expect(Array.isArray(debts.debts)).toBeTruthy();
                debts.debts.forEach(debt => checkIsObjectMatchesDebtsModel(debt, unchangedDebt, false));

                expect(debts).toHaveProperty('summary');
                expect(debts.summary).toHaveProperty('toGive', 0);
                expect(debts.summary).toHaveProperty('toTake', 0);

                return Debts.findById(multipleDebt.id)
            })
            .then((resp) => expect(resp).not.toBeTruthy());
    });
});


describe('DELETE /debts/:id', () => {
    let deletedUserDebt;

    beforeAll((done) => {
        request(app)
            .put('/debts')
            .send({userId: anotherUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                multipleDebt = resp.body;
                done();
            })
            .then(() => {
                const operationPayload = {
                    debtsId: multipleDebt.id,
                    moneyAmount: 300,
                    moneyReceiver: user.id,
                    description: 'test'
                };

                return request(app)
                    .put('/operation')
                    .send(operationPayload)
                    .set('Authorization', 'Bearer ' + token)
                    .expect(200);
            })
            .then(() => done());
    });

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).delete('/debts/' + multipleDebt.id));
        promises.push(request(app).delete('/debts/' + multipleDebt.id).set('Authorization', 'Bearer '));
        promises.push(request(app).delete('/debts/' + multipleDebt.id).set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            null,
            undefined
        ];

        params.forEach(param => {
            promises.push(request(app).delete('/debts/' + param).set('Authorization', 'Bearer ' + token));
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .delete('/debts/' + 'y34ygv4h3')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should reject user if he is not a user of this Debt entity', () => {

        return request(app)
            .delete('/debts/' + multipleDebt.id)
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return all debts to user who\'s deleted', () => {
        return request(app)
            .delete('/debts/' + multipleDebt.id)
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(resp => {
                const debts = resp.body;

                expect(debts).toHaveProperty('debts');
                expect(Array.isArray(debts.debts)).toBeTruthy();

                debts.debts.forEach(debt => {
                    checkIsObjectMatchesDebtsModel(debt, multipleDebt, false);
                });

                expect(debts).toHaveProperty('summary');
                expect(debts.summary).toHaveProperty('toGive', );
                expect(debts.summary).toHaveProperty('toTake', );
            });
    });

    it('should change Debts type to SINGLE_DEBT & status to USER_DELETED', () => {
        return request(app)
            .get('/debts/' + multipleDebt.id)
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(200)
            .then(debt => {
                deletedUserDebt = debt.body;
                expect(deletedUserDebt).toHaveProperty('status', 'USER_DELETED');
                expect(deletedUserDebt).toHaveProperty('statusAcceptor', anotherUser.id);
                expect(deletedUserDebt).toHaveProperty('type', 'SINGLE_USER');
            });
    });

    it('should create virtual user with the same name as deleted user + with his picture', () => {
        expect(deletedUserDebt.user).toHaveProperty('name', user.name + ' BOT');
        expect(deletedUserDebt.user).toHaveProperty('picture', user.picture);

        return User
            .findById(deletedUserDebt.user.id)
            .lean()
            .then(user => {
                expect(user).toHaveProperty('name', deletedUserDebt.user.name);
                expect(user).toHaveProperty('picture', deletedUserDebt.user.picture);
                expect(user).toHaveProperty('virtual');
                expect(user['virtual']).toBeTruthy();
            });
    });

    it('should change req.user.id on virtual user.id everywhere in Debt & operations', () => {
        return Debts
            .findById(deletedUserDebt.id)
            .populate({
                path: 'moneyOperations',
                select: 'moneyReceiver statusAcceptor',
                options: { sort: { 'date': -1 } }
            })
            .then(debt => {
                expect(debt['users'].some(user => user.toString() === deletedUserDebt.user.id.toString())).toBeTruthy();
                expect(JSON.stringify(debt).indexOf(user.id.toString()) === -1).toBeTruthy();
            });
    });

    it('should accept all unaccepted money operations where statusAcceptor === virtualUser', () => {
        deletedUserDebt.moneyOperations
            .every(operation => !(operation.statusAcceptor.toString() === user.id.toString() && operation.status !== 'UNCHANGED');
    });
});

describe('POST /debts/single/:id/i_love_lsd', () => {

    beforeAll((done) => {
        request(app)
            .put('/debts')
            .send({userId: anotherUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .then(resp => multipleDebt = resp.body)
            .then(() => {
                return request(app)
                    .post('/debts/' + multipleDebt.id + '/creation')
                    .set('Authorization', 'Bearer ' + anotherUserToken);
            })
            .then(() => {
                const operationPayload = {
                    debtsId: multipleDebt.id,
                    moneyAmount: 300,
                    moneyReceiver: user.id,
                    description: 'test'
                };

                return request(app)
                    .put('/operation')
                    .send(operationPayload)
                    .set('Authorization', 'Bearer ' + token)
                    .expect(200);
            })
            .then(() => {
                return request(app)
                    .delete('/debts/' + multipleDebt.id)
                    .set('Authorization', 'Bearer ' + token);
            })
            .then(() => {
                return request(app)
                    .get('/debts/' + multipleDebt.id)
                    .set('Authorization', 'Bearer ' + anotherUserToken);
            })
            .then(resp => {
                multipleDebt = resp.body;
                done();
            });
    });

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).post('/debts/single/' + multipleDebt.id + '/i_love_lsd'));
        promises.push(request(app).post('/debts/single/' + multipleDebt.id + '/i_love_lsd').set('Authorization', 'Bearer '));
        promises.push(request(app).post('/debts/single/' + multipleDebt.id + '/i_love_lsd').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            null,
            undefined
        ];

        params.forEach(param => {
            promises.push(request(app).post('/debts/single/' + param + '/i_love_lsd').set('Authorization', 'Bearer ' + token));
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .post('/debts/single/' + 'hgfdtryfugki7' + '/i_love_lsd')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should reject user if he is not a user of this Debt entity', () => {

        return request(app)
            .post('/debts/single/' + multipleDebt.id + '/i_love_lsd')
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should change Debt status from USER_DELETE to CHANGE_AWAITING if some operations don\'t have UNCHANGED status', () => {

        return request(app)
            .post('/debts/single/' + multipleDebt.id + '/i_love_lsd')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(200)
            .then(resp => {
                checkIsObjectMatchesDebtsModel(resp.body, multipleDebt, false);
                expect(resp.body).toHaveProperty('status', 'CHANGE_AWAITING');
                expect(resp.body).toHaveProperty('statusAcceptor', anotherUser.id);
            });
    });

    it('should change Debt status from USER_DELETE to UNCHANGED if all operations have UNCHANGED status', () => {

        return request(app)
            .put('/debts')
            .send({userId: anotherUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .then(resp => multipleDebt = resp.body)
            .then(() => {
                return request(app)
                    .post('/debts/' + multipleDebt.id + '/creation')
                    .set('Authorization', 'Bearer ' + anotherUserToken);
            })
            .then(() => {
                const operationPayload = {
                    debtsId: multipleDebt.id,
                    moneyAmount: 300,
                    moneyReceiver: anotherUser.id,
                    description: 'test'
                };

                return request(app)
                    .put('/operation')
                    .send(operationPayload)
                    .set('Authorization', 'Bearer ' + anotherUserToken)
                    .expect(200);
            })
            .then(() => {
                return request(app)
                    .delete('/debts/' + multipleDebt.id)
                    .set('Authorization', 'Bearer ' + token);
            })
            .then(() => {
                return request(app)
                    .get('/debts/' + multipleDebt.id)
                    .set('Authorization', 'Bearer ' + anotherUserToken);
            })
            .then(resp => {
                multipleDebt = resp.body;

                return request(app)
                    .post('/debts/single/' + multipleDebt.id + '/i_love_lsd')
                    .set('Authorization', 'Bearer ' + anotherUserToken)
                    .expect(200)
                    .then(resp => {
                        checkIsObjectMatchesDebtsModel(resp.body, multipleDebt, false);
                        expect(resp.body).toHaveProperty('status', 'UNCHANGED');
                        expect(resp.body).toHaveProperty('statusAcceptor', null);
                    });
            });
    });
});

describe('PUT /debts/single/:id/connect_user', () => {

    beforeAll((done) => {
        request(app)
            .put('/debts/single')
            .send({userName: 'Valera new', countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .then(debt => {
                connectUserDebt = debt.body;
                connectUserDebtVirtualUser = debt.body.user;
                done();
            });
    });


    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(
            request(app)
                .put('/debts/single/' + connectUserDebt.id + '/connect_user')
                .send({userId: anotherUser.id})
        );
        promises.push(
            request(app)
                .put('/debts/single/' + connectUserDebt.id + '/connect_user')
                .send({userId: anotherUser.id})
                .set('Authorization', 'Bearer ')
        );
        promises.push(
            request(app)
                .put('/debts/single/' + connectUserDebt.id + '/connect_user')
                .send({userId: anotherUser.id})
                .set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC')
        );

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            null,
            undefined
        ];

        params.forEach(param => {
            promises.push(
                request(app)
                    .put('/debts/single/' + param + '/connect_user')
                    .send({userId: anotherUser.id})
                    .set('Authorization', 'Bearer ' + token)
            );
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .put('/debts/single/' + 'nbjvghfdtr567t8y8' + '/connect_user')
            .send({userId: anotherUser.id})
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return 400 if invalid userId is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            'nkbhgffytui78',
            null,
            undefined
        ];
        const params2 = [
            {user: anotherUser.id},
            {userId: user.id}
        ];

        params.forEach(param => {
            promises.push(
                request(app)
                    .put('/debts/single/' + connectUserDebt.id + '/connect_user')
                    .send({userId: param})
                    .set('Authorization', 'Bearer ' + token)
            );
        });

        params2.forEach(param => {
            promises.push(
                request(app)
                    .put('/debts/single/' + connectUserDebt.id + '/connect_user')
                    .send(param)
                    .set('Authorization', 'Bearer ' + token)
            );
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should reject user if he is not a user of this Debt entity', () => {

        return request(app)
            .put('/debts/single/' + connectUserDebt.id + '/connect_user')
            .send({userId: anotherUser.id})
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should send an error if you try to connect user with whom you already have a debt', () => {
        return request(app)
            .put('/debts')
            .send({userId: anotherUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(() => {
                return request(app)
                    .put('/debts/single/' + connectUserDebt.id + '/connect_user')
                    .send({userId: anotherUser.id})
                    .set('Authorization', 'Bearer ' + token)
                    .expect(400);
            })
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should change debts status to CONNECT_USER & status acceptor to userId', () => {
        return request(app)
            .put('/debts/single/' + connectUserDebt.id + '/connect_user')
            .send({userId: thirdUser.id})
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(debt => {
                expect(debt.body).toHaveProperty('status', 'CONNECT_USER');
                expect(debt.body).toHaveProperty('statusAcceptor', thirdUser.id);
                checkIsObjectMatchesDebtsModel(debt.body, connectUserDebt, false);
            });
    });

    it('should send an error if you try to connect user to debt that is already waiting for connection', () => {
        return request(app)
            .put('/debts/single/' + connectUserDebt.id + '/connect_user')
            .send({userId: thirdUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(debt => {
                expect(debt.body).toHaveProperty('error');
            });
    });

    it('should send an error if you try to add an operation to debt that is already waiting for connection', () => {
        return request(app)
            .put('/operation')
            .send({
                debtsId: connectUserDebt.id,
                moneyAmount: 300,
                moneyReceiver: anotherUser.id,
                description: 'test'
            })
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('GET /debts should return debts with status CONNECT_USER and proper status acceptor', () => {
        return request(app)
            .get('/debts')
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(200)
            .then(resp => {
                const debt = resp.body.debts.find(debt => debt.status === 'CONNECT_USER');
                expect(debt).toBeTruthy();
                expect(debt).toHaveProperty('status', 'CONNECT_USER');
                expect(debt).toHaveProperty('statusAcceptor', thirdUser.id);
            });
    });

    it('GET /debts/:id should return debts and change virtual user to user', () => {
        return request(app)
            .get('/debts/' + connectUserDebt.id)
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(200)
            .then(resp => {
                const debt = resp.body;
                expect(debt).toBeTruthy();
                expect(debt).toHaveProperty('status', 'CONNECT_USER');
                expect(debt).toHaveProperty('statusAcceptor', thirdUser.id);
            });
    });
});


describe('POST /debts/single/:id/connect_user', () => {


    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(
            request(app)
                .post('/debts/single/' + connectUserDebt.id + '/connect_user')
        );
        promises.push(
            request(app)
                .post('/debts/single/' + connectUserDebt.id + '/connect_user')
                .set('Authorization', 'Bearer ')
        );
        promises.push(
            request(app)
                .post('/debts/single/' + connectUserDebt.id + '/connect_user')
                .set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC')
        );

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            null,
            undefined
        ];

        params.forEach(param => {
            promises.push(
                request(app)
                    .post('/debts/single/' + param + '/connect_user')
                    .set('Authorization', 'Bearer ' + token)
            );
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .post('/debts/single/' + 'nkbhjvghcfgdtryu' + '/connect_user')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should reject user if he is not a user of this Debt entity', () => {

        return request(app)
            .post('/debts/single/' + connectUserDebt.id + '/connect_user')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should send an error if you try to accept it with no status acceptor user', () => {

        return request(app)
            .post('/debts/single/' + connectUserDebt.id + '/connect_user')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should change status to UNCHANGED, statusAcceptor to null & type to MULTIPLE_USERS', () => {

        return request(app)
            .post('/debts/single/' + connectUserDebt.id + '/connect_user')
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(200)
            .then(resp => {
                const debt = resp.body;

                expect(debt).toHaveProperty('status', 'UNCHANGED');
                expect(debt).toHaveProperty('statusAcceptor', null);
                expect(debt).toHaveProperty('type', 'MULTIPLE_USERS');

                connectUserDebt = debt;
            });
    });

    it('should send an error if you try to accept it one more time', () => {

        return request(app)
            .post('/debts/single/' + connectUserDebt.id + '/connect_user')
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should change virtual user id on user id everywhere (moneyReceiver)', () => {
        expect(JSON.stringify(connectUserDebt).indexOf(connectUserDebtVirtualUser.id) === -1).toBeTruthy();
        expect(JSON.stringify(connectUserDebt).indexOf(thirdUser.id) !== -1);
    });

    it('should delete virtual user from db', () => {
        return User
            .findById(connectUserDebtVirtualUser.id)
            .then(user => expect(user).toBeFalsy());
    });

    it('should delete virtual user picture from fs', (done) => {
        fs.exists('public/images/' + connectUserDebtVirtualUser.picture.match(/[^\/]*$/), (exists) => {
            expect(exists).toBe(false);
            done();
        });
    });
});


describe('DELETE /debts/single/:id/connect_user', () => {

    beforeAll((done) => {
        request(app)
            .put('/debts/single')
            .send({userName: 'Valera new', countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(200)
            .then(debt => {

                return request(app)
                    .put('/debts/single/' + debt.body.id + '/connect_user')
                    .send({userId: thirdUser.id})
                    .set('Authorization', 'Bearer ' + anotherUserToken)
                    .expect(200);
            })
            .then(debt => {
                connectUserDebt = debt.body;
                connectUserDebtVirtualUser = debt.body.user;

                done();
            });
    });


    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(
            request(app)
                .delete('/debts/single/' + connectUserDebt.id + '/connect_user')
        );
        promises.push(
            request(app)
                .delete('/debts/single/' + connectUserDebt.id + '/connect_user')
                .set('Authorization', 'Bearer ')
        );
        promises.push(
            request(app)
                .delete('/debts/single/' + connectUserDebt.id + '/connect_user')
                .set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC')
        );

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should return 400 or 404 if no param is set', () => {
        const promises = [];
        const params = [
            '',
            '/',
            ' ',
            null,
            undefined
        ];

        params.forEach(param => {
            promises.push(
                request(app)
                    .delete('/debts/single/' + param + '/connect_user')
                    .set('Authorization', 'Bearer ' + thirdUserToken)
            );
        });

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBeGreaterThanOrEqual(400);
                expect(resp.statusCode).toBeLessThanOrEqual(404);
            });
        });
    });

    it('should return 400 if invalid param is set', () => {

        return request(app)
            .delete('/debts/single/' + 'nkbhjvghcfgdtryu' + '/connect_user')
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should reject user if he is not a user of this Debt entity', () => {

        return request(app)
            .delete('/debts/single/' + connectUserDebt.id + '/connect_user')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should accept connected user request', () => {

        return request(app)
            .delete('/debts/single/' + connectUserDebt.id + '/connect_user')
            .set('Authorization', 'Bearer ' + thirdUserToken)
            .expect(200);
    });

    it('should accept main user request', () => {

        return Debts
            .findByIdAndUpdate(connectUserDebt.id, {status: 'CONNECT_USER', statusAcceptor: thirdUser.id})
            .then(() => {

                return request(app)
                    .delete('/debts/single/' + connectUserDebt.id + '/connect_user')
                    .set('Authorization', 'Bearer ' + anotherUserToken)
                    .expect(200);
            })
            .then(debt => connectUserDebt = debt.body.debts.find(debt => connectUserDebt.id === debt.id));
    });

    it('should change status to UNCHANGED and statusAcceptor to null', () => {
        expect(connectUserDebt).toHaveProperty('status', 'UNCHANGED');
        expect(connectUserDebt).toHaveProperty('statusAcceptor', null);
    });
});



function checkIsObjectMatchesDebtsModel(object, debtsModel: DebtsModelClass, checkKeys = true): void {
    Object.keys(debtsModel).forEach(key => {
        if(checkKeys) {
            expect(object).toHaveProperty(key, debtsModel[key]);
        } else {
            expect(object).toHaveProperty(key);
        }
    });
}
