import { expect } from 'chai';
import request from 'supertest';
import app from '../src/App';
import WebSocket from 'ws';

const C_HELLO_WORLD = `
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`;

const DEFAULT_PORT = 3000;

describe('App API Endpoints', () => {
    describe('GET /api/v1/version', () => {
        it('should return the version of the application', async () => {
            const res = await request(app).get('/api/v1/version');
            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('version');
        });
    });

    describe('POST /api/v1/build', () => {
        it('should build the project and return a success message', async () => {
            const res = await request(app)
                .post('/api/v1/build')
                .send({ input: '$print("Hello, World!")' });
            expect(res.status).to.equal(201);
            expect(res.body).to.have.property('id');
            expect(res.body.id).to.be.a('string');
            expect(res.body).to.have.property('result');
            expect(res.body.result).to.have.property('success', true);
        });

        it('should return an error for invalid input', async () => {
            const res = await request(app)
                .post('/api/v1/build')
                .send({ input: '' });
            expect(res.status).to.equal(400);
            expect(res.body).to.have.property('errors');
            expect(res.body.errors).to.have.lengthOf.above(0);
        });
    });

    describe('POST /api/v1/run', () => {
        it('should execute the code and return the output', async () => {
            const res = await request(app)
                .post('/api/v1/run')
                .send({ input: C_HELLO_WORLD });
            expect(res.status).to.equal(201);
            expect(res.body).to.have.property('id');
            expect(res.body.id).to.be.a('string');
        });
    });

    describe('WebSocket /run', () => {
        const TEST_PORT = process.env.TEST_PORT || DEFAULT_PORT;
        const WS_URL = `ws://localhost:${TEST_PORT}`;
        const HTTP_URL = `http://localhost:${TEST_PORT}`;
        // ok, i don't know how to test websocket usng app only so this requires a local server
        it('should establish a WebSocket connection and communicate with the client', (done) => {
            fetch(HTTP_URL + '/api/v1/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: C_HELLO_WORLD })
            }).then(res => {
                expect(res.status).to.equal(201);
                return res.json();
            }).then((body: any) => {
                expect(body).to.have.property('id');
                expect(body.id).to.be.a('string');
                const id = body.id;

                const ws = new WebSocket(`${WS_URL}/run?id=${id}`, { rejectUnauthorized: false });

                ws.on('message', (message: any) => {
                    message = message.toString();
                    expect(message).to.satisfy((msg: string) => msg.startsWith('Hello, World!\n'));
                    ws.close();
                    done();
                });

                ws.on('error', (err: Error) => {
                    done(err);
                });
            })
            .catch((err) =>{
                done(err);
            });
        });
    });
});
