const request = require('supertest');
const app = require('../src/app');
describe('GET /login', () => {
    it('should return 200 OK', (done) => {
        request(app).get('/login').then(response => {
            expect(response.statusCode).toBe(200);
            done();
        });
    });
});
describe('GET /signup', () => {
    it('should return 200 OK', (done) => {
        request(app).get('/signup')
            .expect(200, done);
    });
});
//# sourceMappingURL=user.test.js.map