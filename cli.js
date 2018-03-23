#!/usr/bin/env node
'use strict';
const meow = require('meow');
const fkill = require('fkill');
const psList = require('ps-list');
const pidFromPort = require('pid-from-port');
const {h, render} = require('ink');
const importJsx = require('import-jsx');

const ui = importJsx('./ui');

const cli = meow(
	`
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
`,
	{
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
	}
);

async function init() {
	const getPortFromPid = (val, list) => {
		for (const x of list.entries()) {
			if (val === x[1]) {
				return String(x[0]);
			}
		}
		return '';
	};

	const ports = await pidFromPort.list();
	const res = await Promise.all([ports, psList({all: false})]);
	const procs = res[1].map(x =>
		Object.assign(x, {port: getPortFromPid(x.pid, res[0])})
	);
	return procs;
}

const onExit = () => {
	process.exit(1);
};

(async function () {
	if (cli.input.length === 0) {
		// Init the process list in ui
		const list = await init(cli.flags);
		render(h(ui, {list, flags: cli.flags, onExit}));
	} else if (!cli.flags.force) {
		try {
			await fkill(cli.input, Object.assign(cli.flags, {ignoreCase: true}));
		} catch (err) {
			if (/Couldn't find a process with port/.test(err.message)) {
					render(h(ui, {error: err.message, onExit}));
					process.exit(1);
			}
				render(h(ui, {selected: cli.input, onExit}));
		}
	}
})();
