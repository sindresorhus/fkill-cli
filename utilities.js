import process from 'node:process';
import psList from 'ps-list';
import {allPortsWithPid} from 'pid-port';
import chalk from 'chalk';
import {numberSortDescending} from 'num-sort';
import cliTruncate from 'cli-truncate';
import processExists from 'process-exists';
import FuzzySearch from 'fuzzy-search';

const isWindows = process.platform === 'win32';
const commandLineMargins = 4;

const PROCESS_EXITED_MIN_INTERVAL = 5;
const PROCESS_EXITED_MAX_INTERVAL = 1280;

const delay = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

const processExited = async (pid, timeout) => {
	const endTime = Date.now() + timeout;
	let interval = PROCESS_EXITED_MIN_INTERVAL;
	if (interval > timeout) {
		interval = timeout;
	}

	let exists;

	do {
		await delay(interval); // eslint-disable-line no-await-in-loop

		exists = await processExists(pid); // eslint-disable-line no-await-in-loop

		interval *= 2;
		if (interval > PROCESS_EXITED_MAX_INTERVAL) {
			interval = PROCESS_EXITED_MAX_INTERVAL;
		}
	} while (Date.now() < endTime && exists);

	return !exists;
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
		return numberSortDescending(a.cpu + a.memory, b.cpu + b.memory);
	}

	if (hasCpu) {
		return numberSortDescending(a.cpu, b.cpu);
	}

	if (hasMemory) {
		return numberSortDescending(a.memory, b.memory);
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
	const memoryThreshold = flags.verbose ? 0 : 1;
	const cpuThreshold = flags.verbose ? 0 : 3;

	const filteredProcesses = new FuzzySearch(
		processes,
		[flags.verbose && !isWindows ? 'cmd' : 'name'],
		{
			caseSensitive: false,
		},
	)
		.search(input);

	return filteredProcesses
		.filter(process_ => !(
			process_.name.endsWith('-helper')
			|| process_.name.endsWith('Helper')
			|| process_.name.endsWith('HelperApp')
		))
		.sort(preferHeurisicallyInterestingProcesses)
		.map(process_ => {
			const renderPercentage = percents => {
				const digits = Math.floor(percents * 10).toString().padStart(2, '0');
				const whole = digits.slice(0, -1);
				const fraction = digits.slice(-1);
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
				label: `${name} ${chalk.dim(process_.pid)}${spacer}${chalk.dim(ports)}${cpu}${memory}`,
				value: process_.pid,
			};
		});
};

const listAllProcesses = async () => {
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
		allPortsWithPid(),
		psList({all: false}),
	]);

	return processes.map(process_ => ({...process_, ports: getPortsFromPid(process_.pid, pids)}));
};

const regexLastIndexOf = (string, regex, fromIndex) => {
	if (regex.test(fromIndex ? string.slice(fromIndex) : string)) {
		return regex.lastIndex + fromIndex;
	}

	return -1;
};

export {
	listAllProcesses,
	processExited,
	filterProcesses,
	regexLastIndexOf,
};
