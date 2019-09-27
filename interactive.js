'use strict';
const chalk = require('chalk');
const inquirer = require('inquirer');
const psList = require('ps-list');
const numSort = require('num-sort');
const escExit = require('esc-exit');
const cliTruncate = require('cli-truncate');
const pidFromPort = require('pid-from-port');
const fkill = require('fkill');

const commandLineMargins = 4;

const nameFilter = (input, proc) => {
	const isPort = input[0] === ':';

	if (isPort) {
		return proc.ports.find(x => x.startsWith(input.slice(1)));
	}

	return proc.name.toLowerCase().includes(input.toLowerCase());
};

const preferNotMatching = matches => (a, b) => {
	const aMatches = matches(a);
	return (matches(b) === aMatches) ? 0 : (aMatches ? 1 : -1);
};

const deprioritizedProcesses = new Set(['iTerm', 'iTerm2']);
const isDeprioritizedProcess = proc => deprioritizedProcesses.has(proc.name);
const preferNotDeprioritized = preferNotMatching(isDeprioritizedProcess);
const preferHighPerformanceImpact = (a, b) => numSort.desc(a.cpu + a.memory, b.cpu + b.memory);
const preferLowAlphanumericNames = (a, b) => a.name.localeCompare(b.name);

const preferHeurisicallyInterestingProcesses = (a, b) => {
	let result;

	result = preferNotDeprioritized(a, b);
	if (result !== 0) {
		return result;
	}

	result = preferHighPerformanceImpact(a, b);
	if (result !== 0) {
		return result;
	}

	return preferLowAlphanumericNames(a, b);
};

const filterProcesses = (input, processes, flags) => {
	const filters = {
		name: proc => input ? nameFilter(input, proc) : true,
		verbose: proc => input ? (process.platform === 'win32' ? proc.name : proc.cmd).toLowerCase().includes(input.toLowerCase()) : true
	};

	const memoryThreshold = flags.verbose ? 0.0 : 0.5;
	const cpuThreshold = flags.verbose ? 0.0 : 2.0;

	return processes
		.filter(proc => !(
			proc.name.endsWith('-helper') ||
			proc.name.endsWith('Helper') ||
			proc.name.endsWith('HelperApp')
		))
		.filter(flags.verbose ? filters.verbose : filters.name)
		.sort(preferHeurisicallyInterestingProcesses)
		.map(proc => {
			const renderPercentage = percents => {
				const digits = Math.floor(percents * 10).toString().padStart(2, '0');
				return `${digits.substr(0, digits.length - 1)}.${digits.substr(digits.length - 1)}%`;
			};

			const lineLength = process.stdout.columns || 80;
			const ports = proc.ports.length === 0 ? '' : (' ' + proc.ports.slice(0, 4).map(x => `:${x}`).join(' '));
			const memory = (proc.memory !== undefined && (proc.memory > memoryThreshold)) ? ` 🐏${renderPercentage(proc.memory)}` : '';
			const cpu = (proc.cpu !== undefined && (proc.cpu > cpuThreshold)) ? ` ⚡${renderPercentage(proc.cpu)}` : '';
			const margins = commandLineMargins + proc.pid.toString().length + ports.length + memory.length + cpu.length;
			const length = lineLength - margins;
			const name = cliTruncate(flags.verbose && process.platform !== 'win32' ? proc.cmd : proc.name, length, {position: 'middle'});

			return {
				name: `${name} ${chalk.dim(proc.pid)}${chalk.dim.magenta(ports)}${cpu}${memory}`,
				value: proc.pid
			};
		});
};

const handleFkillError = async processes => {
	const suffix = processes.length > 1 ? 'es' : '';

	if (process.stdout.isTTY === false) {
		console.error(`Error killing process${suffix}. Try \`fkill --force ${processes.join(' ')}\``);
		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	} else {
		const answer = await inquirer.prompt([{
			type: 'confirm',
			name: 'forceKill',
			message: 'Error killing process. Would you like to use the force?'
		}]);

		if (answer.forceKill === true) {
			await fkill(processes, {
				force: true,
				ignoreCase: true
			});
		}
	}
};

const listProcesses = async (processes, flags) => {
	inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

	const answer = await inquirer.prompt([{
		name: 'processes',
		message: 'Running processes:',
		type: 'autocomplete',
		pageSize: 10,
		source: async (answers, input) => filterProcesses(input, processes, flags)
	}]);

	try {
		await fkill(answer.processes);
	} catch (_) {
		handleFkillError(answer.processes);
	}
};

const init = async flags => {
	escExit();

	const getPortsFromPid = (value, list) => {
		const ports = [];

		for (const [key, listValue] of list.entries()) {
			if (value === listValue) {
				ports.push(String(key));
			}
		}

		return ports;
	};

	const [pids, processes] = await Promise.all([
		pidFromPort.list(),
		psList({all: false})
	]);
	const procs = processes.map(proc => ({...proc, ports: getPortsFromPid(proc.pid, pids)}));
	listProcesses(procs, flags);
};

module.exports = {init, handleFkillError};
