var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const request = require('supertest');
const app = require('../src/app');
describe('PUT /signup/local', () => {
    const credentials = {
        email: 'real_avatarr@mail.ru',
        password: 'a998877'
    };
    test('should return OnLogin model', () => __awaiter(this, void 0, void 0, function* () {
        const response = yield request(app).put('/signup/local', credentials);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toHaveProperty('user');
        // expect(response.body.user).toHaveProperty('id');
        // expect(response.body.user.id).toBeTruthy();
        //
        // expect(response.body.user).toHaveProperty('name');
        // expect(response.body.user.name).toBeTruthy();
        //
        // expect(response.body.user).toHaveProperty('picture');
        // expect(response.body.user.picture).toBeTruthy();
        //
        //
        // expect(response.body).toHaveProperty('token');
        // expect(response.body.token).toBeTruthy();
        // expect(typeof response.body.token === 'string').toBeTruthy();
    }));
    it('should throw an error if user already exists', (done) => {
        request(app).put('/signup/local', credentials).then(response => {
            expect(response.statusCode).toBe(401);
            expect(response.body).toHaveProperty('error');
            done();
        });
    });
});
//# sourceMappingURL=auth.test.js.map