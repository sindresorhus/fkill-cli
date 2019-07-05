#!/usr/bin/env node
'use strict';
const meow = require('meow');
const fkill = require('fkill');

const cli = meow(`
	Usage
	  $ fkill [<pid|name|:port> …]

	Options
	  --force -f    Force kill
	  --verbose -v  Show process arguments
	  --silent -s   Silently kill and always exit with code 0

	Examples
	  $ fkill 1337
	  $ fkill safari
	  $ fkill :8080
	  $ fkill 1337 safari :8080
	  $ fkill

	To kill a port, prefix it with a colon. For example: :8080.

	Run without arguments to use the interactive interface.
	The process name is case insensitive.
`, {
	inferType: true,
	flags: {
		force: {
			type: 'boolean',
			alias: 'f'
		},
		verbose: {
			type: 'boolean',
			alias: 'v'
		},
		silent: {
			type: 'boolean',
			alias: 's'
		}
	}
});

if (cli.input.length === 0) {
	require('./interactive').init(cli.flags);
} else {
	const promise = fkill(cli.input, {...cli.flags, ignoreCase: true});

	if (cli.flags.silent) {
		promise.catch(error => {
			return;
		});
	} else if (!cli.flags.force) {
		promise.catch(error => {
			if (/Couldn't find a process with port/.test(error.message)) {
				console.error(error.message);
				process.exit(1);
			}

			return require('./interactive').handleFkillError(cli.input);
		});
	}
}
