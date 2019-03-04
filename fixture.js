'use strict';
const http = require('http');

process.on('SIGTERM', () => {});

const server = http.createServer((request, response) => {
	response.end();
});

server.listen(process.argv.slice(2)[0]);
