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
	  $ fkill [<pid|name> ...]

	Options
	  -f, --force    Force kill
	  -v, --verbose  Show process arguments

	Examples
	  $ fkill 1337
	  $ fkill Safari
	  $ fkill 1337 Safari
	  $ fkill

	Run without arguments to use the interactive interface.
`, {
	alias: {
		f: 'force',
		v: 'verbose'
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
		.filter(proc => !proc.name.endsWith(' Helper'))
		.filter(flags.verbose ? filters.verbose : filters.name)
		.sort((a, b) => numSort.asc(a.pid, b.pid))
		.map(proc => {
			const lineLength = process.stdout.columns || 80;
			const margins = commandLineMargins + proc.pid.toString().length;
			const length = lineLength - margins;
			const name = cliTruncate(flags.verbose ? proc.cmd : proc.name, length, {position: 'middle'});
			return {
				name: `${name} ${chalk.dim(proc.pid)}`,
				pid: proc.pid
			};
		});
}

function handleFkillError(processes) {
	if (process.stdout.isTTY === false) {
		console.log(`Error killing process. Try \`fkill --force ${processes}\``);
	} else {
		return inquirer.prompt([{
			type: 'confirm',
			name: 'forceKill',
			message: 'Error killing process. Would you like to use the force?'
		}]).then(answer => {
			if (answer.forceKill === true) {
				return fkill(processes, {force: true});
			}
		});
	}
}

if (cli.input.length === 0) {
	init(cli.flags);
} else {
	fkill(cli.input, cli.flags).catch(() => handleFkillError(cli.input));
}
