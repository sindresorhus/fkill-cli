import process from 'node:process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import search from '@inquirer/search';
import psList from 'ps-list';
import {numberSortDescending} from 'num-sort';
import escExit from 'esc-exit';
import cliTruncate from 'cli-truncate';
import {allPortsWithPid} from 'pid-port';
import fkill from 'fkill';
import {processExists} from 'process-exists';
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

const isHelperProcess = process_ => process_.name.endsWith('-helper')
	|| process_.name.endsWith('Helper')
	|| process_.name.endsWith('HelperApp');

const renderPercentage = percents => {
	const digits = Math.floor(percents * 10).toString().padStart(2, '0');
	const whole = digits.slice(0, -1);
	const fraction = digits.slice(-1);
	return fraction === '0' ? `${whole}%` : `${whole}.${fraction}%`;
};

const renderProcessForDisplay = (process_, flags, memoryThreshold, cpuThreshold) => {
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
		value: process_.pid,
	};
};

const searchProcessesByPort = (processes, port) => processes.filter(process_ => process_.ports.includes(port));

const searchProcessByPid = (processes, pid) => processes.find(process_ => String(process_.pid) === pid);

const searchProcessesByName = (processes, term, searcher) => {
	const lowerTerm = term.toLowerCase();
	const exactMatches = [];
	const startsWithMatches = [];
	const containsMatches = [];

	for (const process_ of processes) {
		const lowerName = process_.name.toLowerCase();
		if (lowerName === lowerTerm) {
			exactMatches.push(process_);
		} else if (lowerName.startsWith(lowerTerm)) {
			startsWithMatches.push(process_);
		} else if (lowerName.includes(lowerTerm)) {
			containsMatches.push(process_);
		}
	}

	// Fuzzy matches (excluding all exact/starts/contains matches)
	const matchedPids = new Set([...exactMatches, ...startsWithMatches, ...containsMatches].map(process_ => process_.pid));
	const fuzzyResults = searcher.search(term).filter(process_ => !matchedPids.has(process_.pid));

	// Combine in priority order
	return [...exactMatches, ...startsWithMatches, ...containsMatches, ...fuzzyResults];
};

const filterAndSortProcesses = (processes, term, searcher) => {
	const filtered = processes.filter(process_ => !isHelperProcess(process_));

	// No search term: show all sorted by performance
	if (!term) {
		return filtered.sort(preferHeurisicallyInterestingProcesses);
	}

	// Search by port
	if (term.startsWith(':')) {
		const port = term.slice(1);
		return searchProcessesByPort(filtered, port);
	}

	// Search by PID
	const pidMatch = searchProcessByPid(filtered, term);
	if (pidMatch) {
		return [pidMatch];
	}

	// Search by name
	return searchProcessesByName(filtered, term, searcher);
};

const handleFkillError = async processes => {
	const shouldForceKill = await promptForceKill(processes, 'Error killing process.');

	if (shouldForceKill) {
		await fkill(processes, {
			force: true,
			ignoreCase: true,
		});
	}
};

const DEFAULT_EXIT_TIMEOUT = 3000;

const attemptKillProcesses = async processes => {
	try {
		await fkill(processes);
		const exitStatuses = await Promise.all(processes.map(process_ => processExited(process_, DEFAULT_EXIT_TIMEOUT)));
		const survivors = processes.filter((_, index) => !exitStatuses[index]);
		return {survivors, hadError: false};
	} catch {
		return {survivors: processes, hadError: true};
	}
};

const promptForceKill = async (survivingProcesses, message) => {
	if (process.stdout.isTTY === false) {
		console.error(`${message} Try \`fkill --force ${survivingProcesses.join(' ')}\``);
		process.exit(1); // eslint-disable-line unicorn/no-process-exit
	}

	const answer = await inquirer.prompt([{
		type: 'confirm',
		name: 'forceKill',
		message: `${message} Would you like to use the force?`,
	}]);

	return answer.forceKill;
};

const performKillSequence = async processes => {
	const processList = Array.isArray(processes) ? processes : [processes];
	const {survivors, hadError} = await attemptKillProcesses(processList);

	if (survivors.length === 0) {
		return;
	}

	const suffix = survivors.length > 1 ? 'es' : '';
	const message = hadError ? `Error killing process${suffix}.` : `Process${suffix} didn't exit in ${DEFAULT_EXIT_TIMEOUT}ms.`;
	const shouldForceKill = await promptForceKill(survivors, message);

	if (shouldForceKill) {
		await fkill(processList, {
			force: true,
			ignoreCase: true,
		});
	}
};

const findPortsForProcess = (processId, portToPidMap) => {
	const ports = [];

	for (const [port, pid] of portToPidMap.entries()) {
		if (processId === pid) {
			ports.push(String(port));
		}
	}

	return ports;
};

const listProcesses = async (processes, flags) => {
	const memoryThreshold = flags.verbose ? 0 : 1;
	const cpuThreshold = flags.verbose ? 0 : 3;
	const searcher = new FuzzySearch(processes, ['name'], {caseSensitive: false});

	const selectedPid = await search({
		message: 'Running processes:',
		pageSize: 10,
		async source(term = '') {
			const matchingProcesses = filterAndSortProcesses(processes, term, searcher);
			return matchingProcesses.map(process_ => renderProcessForDisplay(process_, flags, memoryThreshold, cpuThreshold));
		},
	});

	performKillSequence(selectedPid);
};

const init = async flags => {
	escExit();

	const [portToPidMap, processes] = await Promise.all([
		allPortsWithPid(),
		psList({all: false}),
	]);

	const processesWithPorts = processes.map(process_ => ({
		...process_,
		ports: findPortsForProcess(process_.pid, portToPidMap),
	}));

	listProcesses(processesWithPorts, flags);
};

export {init, handleFkillError};
