#!/usr/bin/env node
'use strict';
var meow = require('meow');
var fkill = require('fkill');

var cli = meow({
	help: [
		'Usage',
		'  $ fkill <pid|name> ...',
		'',
		'Example',
		'  $ fkill 1337',
		'  $ fkill Safari',
		'  $ fkill 1337 Safari'
	]
});

if (cli.input.length === 0) {
	console.error('Please supply at least one process ID/name');
	process.exit(64);
	return;
}

fkill(cli.input, function (err) {
	if (err) {
		console.error(err.message);
		process.exit(1);
	}
});
