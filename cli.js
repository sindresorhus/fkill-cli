#!/usr/bin/env node
'use strict';
const meow = require('meow');
const fkill = require('fkill');
const importJsx = require('import-jsx');
const {h, render} = require('ink');

const ui = importJsx('./ui');

const cli = meow(`
	Usage
	  $ fkill [<pid|name|:port> …]

	Options
	  --force -f    Force kill
	  --verbose -v  Show process arguments

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
		}
	}
});

const handleFkillError = processes => {
	const suffix = processes.length > 1 ? 'es' : '';

	if (process.stdout.isTTY === false) {
		console.error(`Error killing process${suffix}. Try \`fkill --force ${processes.join(' ')}\``);
		process.exit(1);
	}
};

if (cli.input.length === 0) {
	render(h(ui, cli.flags));
} else {
	const promise = fkill(cli.input, Object.assign(cli.flags, {ignoreCase: true}));

	if (!cli.flags.force) {
		promise.catch(err => {
			if (/Couldn't find a process with port/.test(err.message)) {
				console.error(err.message);
				process.exit(1);
			}

			return handleFkillError(cli.input);
		});
	}
}
