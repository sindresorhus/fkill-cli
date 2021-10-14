import process from 'node:process';
import http from 'node:http';

const server = http.createServer((request, response) => {
	response.end();
});

server.listen(process.argv.slice(2)[0]);
