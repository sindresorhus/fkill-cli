import process from 'node:process';
import {createRequire} from 'node:module';
import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import escExit from 'esc-exit';
import fkill from 'fkill';
import hasAnsi from 'has-ansi';
import {processExited, filterProcesses} from './utils.js';
import {Modal} from './modal.js';

const require = createRequire(import.meta.url);
const TextInput = require('ink-text-input').default;
const SelectInput = require('ink-select-input').default;

const DEFAULT_EXIT_TIMEOUT = 3000;

const PROCESS_LIST_MAX_COUNT = 10;

const InteractiveUI = ({processes, flags}) => {
	const [query, setQuery] = useState('');
	const [retrievedProcesses, setRetrievedProcesses] = useState(filterProcesses('', processes, flags));
	const [message, setMessage] = useState('');
	const [modalOpened, setModalOpened] = useState(false);
	const [survivedProcesses, setSurvivedProcesses] = useState([]);
	const [killingExecuting, setKillingExecuting] = useState(false);

	const [selectedProcessName, setSelectedProcessName] = useState('');
	const [selectedProcessPort, setSelectedProcessPort] = useState(0);

	useEffect(() => {
		escExit();
	}, []);

	useEffect(() => {
		setRetrievedProcesses(filterProcesses(query, processes, flags));
	}, [query]);

	const handleReturnKey = selectedProcess => {
		setKillingExecuting(true);
		setSelectedProcessName(selectedProcess.label.split(' ')[0]);
		setSelectedProcessPort(selectedProcess.value);
		performKillSequence(selectedProcess.value);
	};

	const performKillSequence = async processes => {
		if (!Array.isArray(processes)) {
			processes = [processes];
		}

		let didSurvive;
		let hadError;
		try {
			await fkill(processes);
			const exited = await Promise.all(processes.map(process => processExited(process, DEFAULT_EXIT_TIMEOUT)));
			didSurvive = processes.filter((_, i) => !exited[i]);
		} catch (error) {
			didSurvive = processes;
			hadError = error;
		}

		if (didSurvive.length === 0) {
			process.exit(0);
		}

		const suffix = didSurvive.length > 1 ? 'es' : '';
		const problemText = hadError ? `Error killing process${suffix}.` : `Process${suffix} didn't exit in ${DEFAULT_EXIT_TIMEOUT}ms.`;

		if (process.stdout.isTTY === false) {
			console.error(`${problemText} Try \`fkill --force ${didSurvive.join(' ')}\``);
			process.exit(1);
		} else {
			setMessage(problemText + ' ');
			setModalOpened(true);
			setSurvivedProcesses(didSurvive);
		}
	};

	const killProcessForce = async query => {
		if (query === 'Y' && survivedProcesses.length > 0) {
			await fkill(survivedProcesses, {
				force: true,
				ignoreCase: true,
			});
		}

		process.exit(0);
	};

	const renderEmpty = () => (
		<Box marginLeft={2}>
			<Text color="#FF8000">No results...</Text>
		</Box>
	);

	const renderHeader = () => {
		const renderTextInput = () => {
			const textChangeHandler = text => {
				if (hasAnsi(text)) {
					return;
				}

				setQuery(text);
			};

			return (
				<TextInput
					value={query}
					focus={!modalOpened && !killingExecuting}
					placeholder="Use arrow keys or type to search"
					onChange={textChangeHandler}
				/>
			);
		};

		return (
			<Box>
				<Box marginRight={1}>
					<Text>
						<Text bold color="green">{'? '}</Text>
						<Text bold>Running processes:</Text>
						{killingExecuting && <Text color="cyanBright">{' ' + selectedProcessName}</Text>}
						{killingExecuting && <Text dimColor color="cyanBright">{' ' + selectedProcessPort}</Text>}
					</Text>
				</Box>

				{!killingExecuting && renderTextInput()}
			</Box>
		);
	};

	const renderProcessItem = ({isSelected, label}) => <Text color={isSelected ? '#00FFFF' : ''}>{label}</Text>;

	const renderIndicator = ({isSelected}) => <Text color="#00FFFF">{isSelected ? '❯' : ' '} </Text>;

	const renderProcessList = () => {
		if (modalOpened || killingExecuting) {
			return null;
		}

		if (retrievedProcesses.length === 0) {
			return renderEmpty();
		}

		return (
			<SelectInput
				isFocused
				limit={PROCESS_LIST_MAX_COUNT}
				items={retrievedProcesses}
				indicatorComponent={renderIndicator}
				itemComponent={renderProcessItem}
				onSelect={handleReturnKey}
			/>
		);
	};

	const renderFooter = () => {
		if (modalOpened || killingExecuting || retrievedProcesses.length === 0) {
			return null;
		}

		return (
			<Box>
				<Text dimColor>(Move up and down to reveal more choices)</Text>
			</Box>
		);
	};

	return (
		<Box flexDirection="column">
			{renderHeader()}
			{renderProcessList()}
			{renderFooter()}

			<Modal
				opened={modalOpened}
				inputPlaceholder="(Y/n)"
				message={message}
				selectHandler={killProcessForce}
			/>
		</Box>
	);
};

export {InteractiveUI};
