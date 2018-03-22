'use strict';
const http = require('http');

const server = http.createServer((request, response) => {
	response.end();
});

server.listen(process.argv.slice(2)[0]);
