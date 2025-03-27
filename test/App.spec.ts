import { expect } from 'chai';
import request from 'supertest';
import app from '../src/App';

describe('Compiler Service', () => {
    it('should compile and run C code successfully', async () => {
      const code = `
        #include <stdio.h>
        int main() {
          printf("Hello, World!\\n");
          return 0;
        }
      `;
  
      const response = await request(app)
        .post('/compile')
        .send({ code })
        .set('Accept', 'text/event-stream');
  
      expect(response.status).to.equal(200);
  
      let data = '';
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
  
      response.on('end', () => {
        const events = data.split('\n\n').filter(line => line.trim().startsWith('data: '));
        const parsedEvents = events.map(event => JSON.parse(event.split('data: ')[1]));
  
        expect(parsedEvents).to.have.lengthOf(2); // Expecting at least two events: requestId and output
        const requestIdEvent = parsedEvents.find(event => event.requestId);
        const outputEvent = parsedEvents.find(event => event.type === 'output');
  
        expect(requestIdEvent).to.exist;
        expect(outputEvent).to.exist;
        expect(outputEvent.message).to.include('Hello, World!');
      });
    });
  
    it('should handle compilation errors', async () => {
      const code = `
        #include <stdio.h>
        int main() {
          printf("Hello, World!\\n");
          return;
        }
      `;
  
      const response = await request(app)
        .post('/compile')
        .send({ code })
        .set('Accept', 'text/event-stream');
  
      expect(response.status).to.equal(200);
  
      let data = '';
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
  
      response.on('end', () => {
        const events = data.split('\n\n').filter(line => line.trim().startsWith('data: '));
        const parsedEvents = events.map(event => JSON.parse(event.split('data: ')[1]));
  
        expect(parsedEvents).to.have.lengthOf(2); // Expecting at least two events: requestId and error
        const requestIdEvent = parsedEvents.find(event => event.requestId);
        const errorEvent = parsedEvents.find(event => event.type === 'error');
  
        expect(requestIdEvent).to.exist;
        expect(errorEvent).to.exist;
        expect(errorEvent.message).to.include('error');
      });
    });
  
    it('should handle runtime errors', async () => {
      const code = `
        #include <stdio.h>
        int main() {
          int *p = NULL;
          *p = 42;
          return 0;
        }
      `;
  
      const response = await request(app)
        .post('/compile')
        .send({ code })
        .set('Accept', 'text/event-stream');
  
      expect(response.status).to.equal(200);
  
      let data = '';
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
  
      response.on('end', () => {
        const events = data.split('\n\n').filter(line => line.trim().startsWith('data: '));
        const parsedEvents = events.map(event => JSON.parse(event.split('data: ')[1]));
  
        expect(parsedEvents).to.have.lengthOf(2); // Expecting at least two events: requestId and error
        const requestIdEvent = parsedEvents.find(event => event.requestId);
        const errorEvent = parsedEvents.find(event => event.type === 'error');
  
        expect(requestIdEvent).to.exist;
        expect(errorEvent).to.exist;
        expect(errorEvent.message).to.include('Segmentation fault');
      });
    });
  });
  