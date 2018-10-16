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

const cli = meow(`
	Usage
	  $ fkill [<pid|name> …]

	Options
	  --force -f    Force kill
	  --verbose -v  Show process arguments
	  --silent -s   Silently kill and always exit with code 0

	Examples
	  $ fkill 1337
	  $ fkill safari
	  $ fkill 1337 safari
	  $ fkill

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
		},
		silent: {
			type: 'boolean',
			alias: 's'
		}
	}
});

const commandLineMargins = 4;

function init(flags) {
	escExit();

	return psList({all: false}).then(procs => listProcesses(procs, flags));
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

function filterProcesses(input, processes, flags) {
	const filters = {
		name: proc => input ? proc.name.toLowerCase().includes(input.toLowerCase()) : true,
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

			return {
				name: `${name} ${chalk.dim(proc.pid)}`,
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
		promise.catch(() => {
			if (!cli.flags.silent) {
				handleFkillError(cli.input);
			}
		});
	}
}
