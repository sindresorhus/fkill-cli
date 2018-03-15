#!/usr/bin/env node
'use strict';
const meow = require('meow');
const fkill = require('fkill');
const chalk = require('chalk');
const inquirer = require('inquirer');
const psList = require('ps-list');
const numSort = require('num-sort');
const escExit = require('esc-exit');
const cliTruncate = require('cli-truncate');
const pidFromPort = require('pid-from-port');

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

const commandLineMargins = 4;

function init(flags) {
	escExit();

	const getPortFromPid = (val, list) => {
		for (const x of list.entries()) {
			if (val === x[1]) {
				return String(x[0]);
			}
		}

		return '';
	};

	return pidFromPort.list()
		.then(ports => Promise.all([ports, psList({all: false})]))
		.then(res => res[1].map(x => Object.assign(x, {port: getPortFromPid(x.pid, res[0])})))
		.then(procs => listProcesses(procs, flags));
}

function listProcesses(processes, flags) {
	inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

	return inquirer.prompt([{
		name: 'processes',
		message: 'Running processes:',
		type: 'autocomplete',
		pageSize: 10,
		source: (answers, input) => Promise.resolve().then(() => filterProcesses(input, processes, flags))
	}])
		.then(answer => fkill(answer.processes).catch(() => handleFkillError(answer.processes)));
}

function nameFilter(input, proc) {
	const isPort = input[0] === ':';
	const field = isPort ? proc.port : proc.name;
	const keyword = isPort ? input.slice(1) : input;

	return field.toLowerCase().includes(keyword.toLowerCase());
}

function filterProcesses(input, processes, flags) {
	const filters = {
		name: proc => input ? nameFilter(input, proc) : true,
		verbose: proc => input ? proc.cmd.toLowerCase().includes(input.toLowerCase()) : true
	};

	return processes
		.filter(proc => !(
			proc.name.endsWith('-helper') ||
			proc.name.endsWith('Helper') ||
			proc.name.endsWith('HelperApp')
		))
		.filter(flags.verbose ? filters.verbose : filters.name)
		.sort((a, b) => numSort.asc(a.pid, b.pid))
		.map(proc => {
			const lineLength = process.stdout.columns || 80;
			const margins = commandLineMargins + proc.pid.toString().length;
			const length = lineLength - margins;
			const name = cliTruncate(flags.verbose ? proc.cmd : proc.name, length, {position: 'middle'});
			const port = proc.port && `:${proc.port}`;

			return {
				name: `${name} ${chalk.dim(proc.pid)} ${chalk.dim.magenta(port)}`,
				value: proc.pid
			};
		});
}

function handleFkillError(processes) {
	const suffix = processes.length > 1 ? 'es' : '';

	if (process.stdout.isTTY === false) {
		console.log(`Error killing process${suffix}. Try \`fkill --force ${processes.join(' ')}\``);
	} else {
		return inquirer.prompt([{
			type: 'confirm',
			name: 'forceKill',
			message: 'Error killing process. Would you like to use the force?'
		}]).then(answer => {
			if (answer.forceKill === true) {
				return fkill(processes, {
					force: true,
					ignoreCase: true
				});
			}
		});
	}
}

if (cli.input.length === 0) {
	init(cli.flags);
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
