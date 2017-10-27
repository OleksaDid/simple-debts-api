import {default as Debts, DebtsListClass, DebtsModelClass} from "../src/api/models/Debts";
import * as mongoose from 'mongoose';
import User from "../src/api/models/User";
import * as fs from 'fs';

const request = require('supertest');
const app = require('../src/app');


const credentials = {
    email: 'real_avatarr12@mail.ru',
    password: 'a998877'
};

const fbToken = 'EAAJV6d1AA6ABAJHo5lH4Os7muF06jbbWtqTjryqGDtWp4YAoHD5CKzecvxODmUdCz8HgYM7gwc37iZBZB4ZBbTN713crYEjCBMbZBSf45frhppjHufFJyeanPbjPNldPrgnMDHA4Gv0gkNoZAs6rDPTQ2x9ZCUX4iTIrUu3ORHKXiyQkip6ZBVASadurdUtB5Bm3SMQyafhZCsrrI1AyacxGZCP7P7IoUZBYcZD';

let token = '';
let user;
let anotherUserToken = '';
let anotherUser;

let singleDebt;
let multipleDebt;

// TODO: test toGive/toTake in GET /debts
// TODO: check statusAcceptor & moneyAcceptor


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
        mongoose.connection.collections['debts'].drop()
    );


    return Promise.all(promises)
        .then(responses => {
            anotherUserToken = responses[0].body.token;
            anotherUser = responses[0].body.user;

            token = responses[1].body.token;
            user = responses[1].body.user;

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
                const expectedDebts: any = new DebtsModelClass(
                    user.id,
                    anotherUser.id,
                    'MULTIPLE_USERS',
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
                const expectedDebts: any = new DebtsModelClass(
                    user.id,
                    anotherUser.id,
                    'SINGLE_USER',
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
                const debtsModel: any = new DebtsModelClass(
                    user.id,
                    anotherUser.id,
                    'MULTIPLE_USERS',
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


describe('DELETE /debts/single/:id', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).delete('/debts/single/' + singleDebt.id));
        promises.push(request(app).delete('/debts/single/' + singleDebt.id).set('Authorization', 'Bearer '));
        promises.push(request(app).delete('/debts/single/' + singleDebt.id).set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

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
           promises.push(request(app).delete('/debts/single/' + param).set('Authorization', 'Bearer ' + token));
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
            .delete('/debts/single/' + 'pj2i4hui3gyfu')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
               expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return all debts', () => {

        return request(app)
            .delete('/debts/single/' + singleDebt.id)
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(resp => {
                const debts = resp.body;
                const debtsModel: any = new DebtsModelClass(
                    user.id,
                    anotherUser.id,
                    'MULTIPLE_USERS',
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

    it('should return an error if not statusAcceptor tries to accept debts', () => {

        return request(app)
            .delete('/debts/' + multipleDebt.id + '/creation')
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
});



describe('PUT /debts/:id/delete_request', () => {

    beforeAll((done) => {
        request(app)
            .put('/debts')
            .send({userId: anotherUser.id, countryCode: 'UA'})
            .set('Authorization', 'Bearer ' + token)
            .then((resp) => {
                multipleDebt = resp.body;
                done();
            });
    });

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).put('/debts/' + multipleDebt.id + '/delete_request'));
        promises.push(request(app).put('/debts/' + multipleDebt.id + '/delete_request').set('Authorization', 'Bearer '));
        promises.push(request(app).put('/debts/' + multipleDebt.id + '/delete_request').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

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
            promises.push(request(app).put('/debts/' + param + '/delete_request').set('Authorization', 'Bearer ' + token));
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
            .put('/debts/' + 'y34ygv4h3' + '/delete_request')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return an error if debts status is not \'UNCHANGED\'', () => {
        return request(app)
            .put('/debts/' + multipleDebt.id + '/delete_request')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error', 'Cannot modify debts that need acceptance');
            });
    });

    it('should return all debts & change status to \'DELETE AWAITING\'', () => {
        return request(app)
            .post('/debts/' + multipleDebt.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(200)
            .then(() => {
                return request(app)
                    .put('/debts/' + multipleDebt.id + '/delete_request')
                    .set('Authorization', 'Bearer ' + token)
                    .expect(200)
                    .then(resp => {
                        const debts = resp.body;
                        const unchangedDebt = JSON.parse(JSON.stringify(multipleDebt));
                        unchangedDebt.status = 'DELETE_AWAITING';
                        unchangedDebt.statusAcceptor = anotherUser.id;
                        unchangedDebt.user = anotherUser;
                        delete unchangedDebt.moneyOperations;

                        expect(debts).toHaveProperty('debts');
                        expect(Array.isArray(debts.debts)).toBeTruthy();
                        debts.debts.forEach(debt => checkIsObjectMatchesDebtsModel(debt, unchangedDebt, false));

                        expect(debts).toHaveProperty('summary');
                        expect(debts.summary).toHaveProperty('toGive', 0);
                        expect(debts.summary).toHaveProperty('toTake', 0);
                    });
            });
    });
});


describe('POST /debts/:id/delete_request', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).post('/debts/' + multipleDebt.id + '/delete_request'));
        promises.push(request(app).post('/debts/' + multipleDebt.id + '/delete_request').set('Authorization', 'Bearer '));
        promises.push(request(app).post('/debts/' + multipleDebt.id + '/delete_request').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

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
            promises.push(request(app).post('/debts/' + param + '/delete_request').set('Authorization', 'Bearer ' + token));
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
            .post('/debts/' + 'y34ygv4h3' + '/delete_request')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return an error if not statusAcceptor tries to decline debts delete', () => {

        return request(app)
            .post('/debts/' + multipleDebt.id + '/delete_request')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return all debts & change status of debtId from \'DELETE_AWAITING\' to \'UNCHANGED\' & change statusAcceptor to null', () => {
        expect(multipleDebt.status).toBe('CREATION_AWAITING');

        return request(app)
            .post('/debts/' + multipleDebt.id + '/delete_request')
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


describe('DELETE /debts/:id/delete_request', () => {

    beforeAll((done) => {
        request(app)
            .put('/debts/' + multipleDebt.id + '/delete_request')
            .set('Authorization', 'Bearer ' + token)
            .then(() => done());
    });

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).delete('/debts/' + multipleDebt.id + '/delete_request'));
        promises.push(request(app).delete('/debts/' + multipleDebt.id + '/delete_request').set('Authorization', 'Bearer '));
        promises.push(request(app).delete('/debts/' + multipleDebt.id + '/delete_request').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

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
            promises.push(request(app).delete('/debts/' + param + '/delete_request').set('Authorization', 'Bearer ' + token));
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
            .delete('/debts/' + 'y34ygv4h3' + '/delete_request')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return an error if not statusAcceptor tries to accept debts', () => {

        return request(app)
            .delete('/debts/' + multipleDebt.id + '/delete_request')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return all debts', () => {
        return request(app)
            .delete('/debts/' + multipleDebt.id + '/delete_request')
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

    it('should delete debt from db', () => {
        return Debts.findById(multipleDebt.id)
            .then((resp) => expect(resp).not.toBeTruthy());
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
