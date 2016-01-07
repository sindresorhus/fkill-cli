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
	  -f, --force  Force kill

	Examples
	  $ fkill 1337
	  $ fkill Safari
	  $ fkill 1337 Safari
	  $ fkill

	Run without arguments to use the interactive interface.
`, {
	alias: {
		f: 'force'
	}
});

function init() {
	escExit();

	return psList({all: false}).then(listProcesses);
}

function listProcesses(processes) {
	inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

	inquirer.prompt([{
		name: 'processes',
		message: 'Running processes:',
		type: 'autocomplete',
		source: (answers, input) => filterProcesses(input, processes)
	}], answer => {
		fkill(answer.processes).then(init);
	});
}

function filterProcesses(input, processes) {
	return new Promise(resolve => {
		resolve(processes
			.filter(proc => input ? proc.name.includes(input.toLowerCase()) : true)
			.sort((a, b) => numSort.asc(a.pid, b.pid))
			.map(proc => ({
				name: `${proc.name} ${chalk.dim(proc.pid)}`,
				value: proc.pid
			}))
		);
	});
}

if (cli.input.length === 0) {
	init();
} else {
	fkill(cli.input, cli.flags);
}
