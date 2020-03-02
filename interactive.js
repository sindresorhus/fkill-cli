'use strict';
const chalk = require('chalk');
const inquirer = require('inquirer');
const psList = require('ps-list');
const numSort = require('num-sort');
const escExit = require('esc-exit');
const cliTruncate = require('cli-truncate');
const pidFromPort = require('pid-from-port');
const fkill = require('fkill');

const isWindows = process.platform === 'win32';
const commandLineMargins = 4;

const nameFilter = (input, process_) => {
	const isPort = input[0] === ':';

	if (isPort) {
		return process_.ports.find(x => x.startsWith(input.slice(1)));
	}

	return process_.name.toLowerCase().includes(input.toLowerCase());
};

const preferNotMatching = matches => (a, b) => {
	const aMatches = matches(a);
	return matches(b) === aMatches ? 0 : (aMatches ? 1 : -1);
};

const deprioritizedProcesses = new Set(['iTerm', 'iTerm2', 'fkill']);
const isDeprioritizedProcess = process_ => deprioritizedProcesses.has(process_.name);
const preferNotDeprioritized = preferNotMatching(isDeprioritizedProcess);
const preferLowAlphanumericNames = (a, b) => a.name.localeCompare(b.name);

const preferHighPerformanceImpact = (a, b) => {
	const hasCpu = typeof a.cpu === 'number' && typeof b.cpu === 'number';
	const hasMemory = typeof a.memory === 'number' && typeof b.memory === 'number';

	if (hasCpu && hasMemory) {
		return numSort.descending(a.cpu + a.memory, b.cpu + b.memory);
	}

	if (hasCpu) {
		return numSort.descending(a.cpu, b.cpu);
	}

	if (hasMemory) {
		return numSort.descending(a.memory, b.memory);
	}

	return 0;
};

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
		name: process_ => input ? nameFilter(input, process_) : true,
		verbose: process_ => input ? (isWindows ? process_.name : process_.cmd).toLowerCase().includes(input.toLowerCase()) : true
	};

	const memoryThreshold = flags.verbose ? 0 : 1;
	const cpuThreshold = flags.verbose ? 0 : 3;

	return processes
		.filter(process_ => !(
			process_.name.endsWith('-helper') ||
			process_.name.endsWith('Helper') ||
			process_.name.endsWith('HelperApp')
		))
		.filter(flags.verbose ? filters.verbose : filters.name)
		.sort(preferHeurisicallyInterestingProcesses)
		.map(process_ => {
			const renderPercentage = percents => {
				const digits = Math.floor(percents * 10).toString().padStart(2, '0');
				const whole = digits.slice(0, digits.length - 1);
				const fraction = digits.slice(digits.length - 1);
				return fraction === '0' ? `${whole}%` : `${whole}.${fraction}%`;
			};

			const lineLength = process.stdout.columns || 80;
			const ports = process_.ports.length === 0 ? '' : (' ' + process_.ports.slice(0, 4).map(x => `:${x}`).join(' '));
			const memory = (process_.memory !== undefined && (process_.memory > memoryThreshold)) ? ` 🐏${renderPercentage(process_.memory)}` : '';
			const cpu = (process_.cpu !== undefined && (process_.cpu > cpuThreshold)) ? `🚦${renderPercentage(process_.cpu)}` : '';
			const margins = commandLineMargins + process_.pid.toString().length + ports.length + memory.length + cpu.length;
			const length = lineLength - margins;
			const name = cliTruncate(flags.verbose && !isWindows ? process_.cmd : process_.name, length, {position: 'middle', preferTruncationOnSpace: true});
			const extraMargin = 2;
			const spacer = lineLength === process.stdout.columns ? ''.padEnd(length - name.length - extraMargin) : '';

			return {
				name: `${name} ${chalk.dim(process_.pid)}${spacer}${chalk.dim(ports)}${cpu}${memory}`,
				value: process_.pid
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

	const procs = processes.map(process_ => ({...process_, ports: getPortsFromPid(process_.pid, pids)}));
	listProcesses(procs, flags);
};

module.exports = {init, handleFkillError};
