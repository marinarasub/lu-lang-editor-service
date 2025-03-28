import { Request, Response, NextFunction } from 'express';

async function post(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ message: 'Hello, Run!' });
    } catch (error) {
        console.error(error);
        next(error);
    }
}

export { post };

// const requestStreams = new Map();

// // Endpoint to handle C compilation and execution
// router.post('/', (req, res) => {
//   const requestId = uuidv4();
//   const { code } = req.body;

//   // Create a new SSE stream for this request
//   const headers = {
//     'Content-Type': 'text/event-stream',
//     'Cache-Control': 'no-cache',
//     'Connection': 'keep-alive'
//   };
//   res.writeHead(200, headers);

//   // Store the response object in the map
//   requestStreams.set(requestId, res);

//   // Write the request ID to the client
//   res.write(`data: ${JSON.stringify({ requestId })}\n\n`);

//   // Compile and run the C code with a timeout
//   const compileCommand = `gcc -o /tmp/${requestId} -x c -`;
//   const runCommand = `/tmp/${requestId}`;

//   const compileProcess = exec(compileCommand, { input: code }, (compileError, compileStdout, compileStderr) => {
//     if (compileError) {
//       res.write(`data: ${JSON.stringify({ type: 'error', message: compileStderr })} \n\n`);
//       res.end();
//       return;
//     }

//     const runProcess = exec(runCommand, { timeout: 30000 }, (runError, runStdout, runStderr) => {
//       if (runError) {
//         res.write(`data: ${JSON.stringify({ type: 'error', message: runStderr })} \n\n`);
//       } else {
//         res.write(`data: ${JSON.stringify({ type: 'output', message: runStdout })} \n\n`);
//       }
//       res.end();
//     });

//     runProcess.stdout.on('data', (data) => {
//       res.write(`data: ${JSON.stringify({ type: 'output', message: data.toString() })} \n\n`);
//     });

//     runProcess.stderr.on('data', (data) => {
//       res.write(`data: ${JSON.stringify({ type: 'error', message: data.toString() })} \n\n`);
//     });
//   });

//   compileProcess.stderr.on('data', (data) => {
//     res.write(`data: ${JSON.stringify({ type: 'error', message: data.toString() })} \n\n`);
//   });
// });

// // Endpoint to check the status of a request
// app.get('/status/:requestId', (req, res) => {
//   const { requestId } = req.params;
//   if (requestStreams.has(requestId)) {
//     res.json({ status: 'running' });
//   } else {
//     res.json({ status: 'completed' });
//   }
// });