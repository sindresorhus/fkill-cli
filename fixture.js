const http = require('http');

const srv = http.createServer((req, res) => {
	res.end();
});

srv.listen(process.argv.slice(2)[0]);
