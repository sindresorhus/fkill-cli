#!/usr/bin/env node
'use strict';
const meow = require('meow');
const fkill = require('fkill');
const chalk = require('chalk');
const inquirer = require('inquirer');
const psList = require('ps-list');
const numSort = require('num-sort');
const escExit = require('esc-exit');

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

function init(flags) {
	escExit();

	return psList({all: false}).then(procs => listProcesses(procs, flags));
}

function listProcesses(processes, flags) {
	inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
	const verbose = flags.verbose || false;

	return inquirer.prompt([{
		name: 'processes',
		message: 'Running processes:',
		type: 'autocomplete',
		source: (answers, input) => Promise.resolve().then(() => filterProcesses(input, processes, verbose))
	}])
		.then(answer => fkill(answer.processes))
		.then(init);
}

function filterProcesses(input, processes, verbose) {
	const filters = {
		name: proc => input ? proc.name.toLowerCase().includes(input.toLowerCase()) : true,
		verbose: proc => input ? proc.cmd.toLowerCase().includes(input.toLowerCase()) : true
	};
	return processes
		.filter(verbose ? filters.verbose : filters.name)
		.sort((a, b) => numSort.asc(a.pid, b.pid))
		.map(proc => ({
			name: `${verbose ? proc.cmd : proc.name} ${chalk.dim(proc.pid)}`,
			value: proc.pid
		}));
}

if (cli.input.length === 0) {
	init(cli.flags);
} else {
	fkill(cli.input, cli.flags);
}
