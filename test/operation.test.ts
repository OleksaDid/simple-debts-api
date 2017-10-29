import * as mongoose from "mongoose";
import MoneyOperation from "../src/api/models/MoneyOperation";
import Debts from "../src/api/models/Debts";
import {App} from "../src/app";

const request = require('supertest');
const app = new App().application;


const credentials = {
    email: 'real_avatarr12@mail.ru',
    password: 'a998877'
};

const fbToken = 'EAAJV6d1AA6ABAJHo5lH4Os7muF06jbbWtqTjryqGDtWp4YAoHD5CKzecvxODmUdCz8HgYM7gwc37iZBZB4ZBbTN713crYEjCBMbZBSf45frhppjHufFJyeanPbjPNldPrgnMDHA4Gv0gkNoZAs6rDPTQ2x9ZCUX4iTIrUu3ORHKXiyQkip6ZBVASadurdUtB5Bm3SMQyafhZCsrrI1AyacxGZCP7P7IoUZBYcZD';

let token = '';
let user;
let anotherUserToken = '';
let anotherUser;

let debt;
let singleDebt;

let operationPayload;
let operationPayloadSingle;

let operation;
let operationSingle;
let moneyOperations = [];

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

    promises.push(
        mongoose.connection.collections['moneyoperations'].drop()
    );


    return Promise.all(promises)
        .then(responses => {
            anotherUserToken = responses[0].body.token;
            anotherUser = responses[0].body.user;

            token = responses[1].body.token;
            user = responses[1].body.user;

            return request(app)
                .put('/debts')
                .send({userId: anotherUser.id, countryCode: 'UA'})
                .set('Authorization', 'Bearer ' + token);
        })
        .then(resp => {
            debt = resp.body;

            return request(app)
                .post('/debts/' + resp.body.id + '/creation')
                .set('Authorization', 'Bearer ' + anotherUserToken);
        })
        .then(resp => {
            debt.status = 'UNCHANGED';
            debt.statusAcceptor = null;

            operationPayload = {
                debtsId: debt.id,
                moneyAmount: 300,
                moneyReceiver: anotherUser.id,
                description: 'test'
            };

            return request(app)
                .put('/debts/single')
                .send({userName: 'Valera12', countryCode: 'UA'})
                .set('Authorization', 'Bearer ' + token);
        })
        .then(resp => {
            singleDebt = resp.body;


            operationPayloadSingle = {
                debtsId: singleDebt.id,
                moneyAmount: 300,
                moneyReceiver: singleDebt.user.id,
                description: 'test'
            };

            done();
        });
});



describe('PUT /operation', () => {

    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).put('/operation').send(operationPayload));
        promises.push(request(app).put('/operation').send(operationPayload).set('Authorization', 'Bearer '));
        promises.push(request(app).put('/operation').send(operationPayload).set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

        return Promise.all(promises).then(responses => {
            responses.forEach(resp => {
                expect(resp.statusCode).toBe(401);
            });
        });
    });

    it('should throw an error if you try to create operation w/ invalid debtsId', () => {
        const promises = [];
        const debtIds = ['bkhjvgcfydte565r7t8', '', 'A', null, undefined, 235, true, false, [], ['lnjbjgyiuh'], {}];

        debtIds.forEach(id => {
            promises.push(
                request(app)
                    .put('/operation')
                    .send(Object.assign({}, operationPayload, {debtsId: id}))
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

    it('should throw an error if you try to create operation w/ invalid moneyReceiver', () => {
        const promises = [];
        const userIds = ['bkhjvgcfydte565r7t8', '', 'A', null, undefined, 235, true, false, [], ['erhkvb'], {}];

        userIds.forEach(id => {
            promises.push(
                request(app)
                    .put('/operation')
                    .send(Object.assign({}, operationPayload, {moneyReceiver: id}))
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

    it('should throw an error if you try to create operation w/ invalid moneyAmount', () => {
        const promises = [];
        const moneyVariants = ['bkhjvgcfydte565r7t8', '', 'A', null, undefined, true, false, 0, -20, [], [20], {}];

        moneyVariants.forEach(sum => {
            promises.push(
                request(app)
                    .put('/operation')
                    .send(Object.assign({}, operationPayload, {moneyAmount: sum}))
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

    it('should throw an error if you try to create operation w/ invalid description', () => {
        const promises = [];
        const descriptions = [
            'rjglnrluhriluvhgeriugveiryvgrekgvkregvkergvjlkhgfdsdrtyuijkhgfdet4567iuhjgfde45678iuhjgfde45678yiuhjgvfcdxserytu6yhjkbvcdxfrtyuihkjbvcdfrtyuijhgvfgftyghftyugjhfctyhgvhfhtybvghfjvcfghjvbfcgh'];

        descriptions.forEach(desc => {
            promises.push(
                request(app)
                    .put('/operation')
                    .send(Object.assign({}, operationPayload, {description: desc}))
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

    it('creates new operation in db', () => {
        return request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayload))
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(() => {
                MoneyOperation.find({}).then(resp => {
                    expect(resp).toBeTruthy();
                    expect(Array.isArray(resp)).toBeTruthy();
                    expect(resp.length).toBe(1);
                    moneyOperations.push(resp[0]);
                    operation = resp[0];
                });
            });
    });

    it('creates new operation in moneyOperations array of debts object', () => {
        return request(app)
            .get('/debts/' + debt.id)
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('moneyOperations');
                expect(Array.isArray(resp.body.moneyOperations)).toBeTruthy();
                expect(resp.body.moneyOperations.length).toBe(1);

                const moneyOperation = resp.body.moneyOperations[0];
                // date moneyAmount moneyReceiver description status statusAcceptor
                expect(moneyOperation).toHaveProperty('id', operation.id);
                expect(moneyOperation).toHaveProperty('date');
                expect(new Date(moneyOperation.date).getTime()).toBe(new Date(operation.date).getTime());
                expect(moneyOperation).toHaveProperty('moneyReceiver', operationPayload.moneyReceiver);
                expect(moneyOperation).toHaveProperty('moneyAmount', operationPayload.moneyAmount);
                expect(moneyOperation).toHaveProperty('description', operationPayload.description);
                expect(moneyOperation).toHaveProperty('status', 'CREATION_AWAITING');
                expect(moneyOperation).toHaveProperty('statusAcceptor', anotherUser.id);

            });
    });

    it('changes debts status to \'CHANGE_AWAITING\' for multiple users', () => {
        return request(app)
            .get('/debts/' + debt.id)
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('status', 'CHANGE_AWAITING');
            });
    });

    it('doesn\'t change debts debt summary for multiple users', () => {
        return request(app)
            .get('/debts/' + debt.id)
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('summary', 0);
                expect(resp.body).toHaveProperty('moneyReceiver', null);
            });
    });

    it('sets statusAcceptor to another user in multiple users', () => {
        return request(app)
            .get('/debts/' + debt.id)
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('statusAcceptor', anotherUser.id);
            });
    });

    it('returnes debt object', () => {
        return request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayload))
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                Object.keys(debt).forEach(key => {
                    expect(resp.body).toHaveProperty(key);
                });

                debt = resp.body;
            });
    });

    it('doesn\'t change status for single user debt', () => {
        return request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayloadSingle))
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                Object.keys(singleDebt).forEach(key => {
                    expect(resp.body).toHaveProperty(key);
                });

                expect(resp.body).toHaveProperty('status', 'UNCHANGED');
            });
    });

    it('add summary in single debts', () => {
        return request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayloadSingle))
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('summary', operationPayload.moneyAmount * 2);
                expect(resp.body).toHaveProperty('moneyReceiver', operationPayloadSingle.moneyReceiver);
            });
    });

    it('deduct summary in single debts', () => {
        return request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayloadSingle, {moneyReceiver: user.id}))
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('summary', operationPayload.moneyAmount);
                expect(resp.body).toHaveProperty('moneyReceiver', operationPayloadSingle.moneyReceiver);
            });
    });

    it('sets money receiver to null if summary is 0', () => {
        return request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayloadSingle, {moneyReceiver: user.id}))
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('summary', 0);
                expect(resp.body).toHaveProperty('moneyReceiver', null);
            });
    });

    it('changes money receiver depending on summary', () => {
        return request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayloadSingle, {moneyReceiver: user.id}))
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('summary', operationPayloadSingle.moneyAmount);
                expect(resp.body).toHaveProperty('moneyReceiver', user.id);
            });
    });

    it('doesn\'t change statusAcceptor in single debts', () => {
        return request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayloadSingle, {moneyReceiver: user.id}))
            .set('Authorization', 'Bearer ' + token)
            .then(resp => {
                expect(resp.body).toHaveProperty('statusAcceptor', null);

                operationSingle = resp.body.moneyOperations[0];
                singleDebt = resp.body;
            });
    });
});




describe('POST /operation/:id/creation', () => {
    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).post('/operation/' + operation.id + '/creation'));
        promises.push(request(app).post('/operation/' + operation.id + '/creation').set('Authorization', 'Bearer '));
        promises.push(request(app).post('/operation/' + operation.id + '/creation').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

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
            promises.push(request(app).post('/operation/' + param + '/creation').set('Authorization', 'Bearer ' + anotherUserToken));
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
            .post('/operation/' + 'knjkbhgvfyrdte45r' + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return 400 if you try to accept operation from single debts', () => {

        return request(app)
            .post('/operation/' + operationSingle.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return 400 if no statusAcceptor tries to accept operation', () => {

        return request(app)
            .post('/operation/' + operation.id + '/creation')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return debts by id and calculate summary', () => {

        return request(app)
            .post('/operation/' + operation.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(200)
            .then(resp => {
                expect(resp.body).toHaveProperty('summary', operationPayload.moneyAmount);
                expect(resp.body).toHaveProperty('moneyReceiver', operationPayload.moneyReceiver);
                expect(resp.body).toHaveProperty('status', 'CHANGE_AWAITING');

                debt = resp.body;
            });
    });

    it('should change debt\'s status to \'UNCHANGED\' if all operations are accepted', () => {
        const promises = [];

        debt.moneyOperations.forEach(op => {
            if(op.status === 'CREATION_AWAITING') {
                promises.push(
                    request(app)
                        .post('/operation/' + op.id + '/creation')
                        .set('Authorization', 'Bearer ' + anotherUserToken)
                        .expect(200)
                );
            }
        });

        return Promise.all(promises)
            .then(() => {
                return Debts.findById(debt.id).then((debt: any) => {
                    console.log(debt);

                   expect(debt.status).toBe('UNCHANGED');
                });
            });
    });

    it('should return an error if you try to accept the same operation few times', () => {
        return request(app)
            .post('/operation/' + operation.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should change operation\'s status to \'UNCHANGED\'', () => {
        return MoneyOperation.findById(operation.id).then((resp: any) => {
            expect(resp.status).toBe('UNCHANGED');
            expect(resp.statusAcceptor).toBeNull();
        });
    });

});




describe('DELETE /operation/:id/creation', () => {
    let newOperation;

    beforeAll((done) => {
        request(app)
            .put('/operation')
            .send(Object.assign({}, operationPayload))
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(resp => {
                newOperation = resp.body.moneyOperations[0];
                done();
            });
    });


    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).delete('/operation/' + newOperation.id + '/creation'));
        promises.push(request(app).delete('/operation/' + newOperation.id + '/creation').set('Authorization', 'Bearer '));
        promises.push(request(app).delete('/operation/' + newOperation.id + '/creation').set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

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
            promises.push(request(app).delete('/operation/' + param + '/creation').set('Authorization', 'Bearer ' + anotherUserToken));
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
            .delete('/operation/' + 'knjkbhgvfyrdte45r' + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return 400 if you try to delete operation from single debts', () => {

        return request(app)
            .delete('/operation/' + operationSingle.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return 400 if no statusAcceptor tries to accept operation', () => {

        return request(app)
            .delete('/operation/' + newOperation.id + '/creation')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return 400 if you try to delete accepted operation', () => {

        return request(app)
            .delete('/operation/' + operation.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return debts by id, set status to \'UNCHANGED\' and remove operation from list', () => {

        return request(app)
            .delete('/operation/' + newOperation.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(200)
            .then(resp => {
                expect(resp.body).toHaveProperty('status', 'UNCHANGED');
                expect(resp.body).toHaveProperty('statusAcceptor', null);

                expect(resp.body.moneyOperations.find(operation => operation.id === newOperation.id)).not.toBeTruthy();
            });
    });

    it('should return an error if you try to delete the same operation few times', () => {
        return request(app)
            .delete('/operation/' + newOperation.id + '/creation')
            .set('Authorization', 'Bearer ' + anotherUserToken)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should remove operation from db', () => {
        return MoneyOperation
            .findById(newOperation.id)
            .then(resp => {
                expect(resp).toBe(null);
            });
    });
});



describe('DELETE /operation/:id', () => {
    it('should return 401 error if token is invalid', () => {
        const promises = [];

        promises.push(request(app).delete('/operation/' + singleDebt.id));
        promises.push(request(app).delete('/operation/' + singleDebt.id).set('Authorization', 'Bearer '));
        promises.push(request(app).delete('/operation/' + singleDebt.id).set('Authorization', 'Bearer KJHFxjfhgIY6r756DRTg86F&%rctjyUG&*6f5rC'));

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
            promises.push(request(app).delete('/operation/' + param).set('Authorization', 'Bearer ' + token));
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
            .delete('/operation/' + 'pj2i4hui3gyfu')
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return 400 if you try to delete operation from multiple debts', () => {

        return request(app)
            .delete('/operation/' + operation.id)
            .set('Authorization', 'Bearer ' + token)
            .expect(400)
            .then(resp => {
                expect(resp.body).toHaveProperty('error');
            });
    });

    it('should return debts by id & recalculate summary & remove id from moneyOperations list', () => {
        return request(app)
            .delete('/operation/' + operationSingle.id)
            .set('Authorization', 'Bearer ' + token)
            .expect(200)
            .then(resp => {
                Object.keys(singleDebt).forEach(key => {
                    expect(resp.body).toHaveProperty(key);
                });

                expect(singleDebt.summary).not.toBe(resp.body.summary);

                expect(resp.body.moneyOperations.find(operation => operation.id === operationSingle.id)).not.toBeTruthy();
            });
    });

    it('should remove operation from db', () => {
        return MoneyOperation
            .findById(operationSingle.id)
            .then(resp => {
                expect(resp).toBe(null);
            });
    });
});