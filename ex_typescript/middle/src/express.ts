import * as express from 'express';

// Create a new express application instance
const app: express.Application = express.default();

// Express 5 (path-to-regexp 8) не приймає голий '*': потрібен іменований wildcard
app.get('/{*path}', function (req, res) {
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

// ============ package.json
// "dev": "ts-node-dev --respawn --transpileOnly ./app/app.ts",
// "prod": "tsc && node ./build/app.js"
// npm run tsc -- --init
