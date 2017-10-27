"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supertest = require("supertest");
const request = supertest('http://localhost:8000');
describe('GET /random-url', () => {
    it('should return 404', (done) => {
        request.get('/reset')
            .expect(404, done);
    });
});
//# sourceMappingURL=app.test.js.map