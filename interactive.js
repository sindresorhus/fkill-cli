import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import process from 'node:process';
import escExit from 'esc-exit';
import fkill from 'fkill';
import hasAnsi from 'has-ansi';
import {processExited, filterProcesses} from './utils.js';
import { Modal } from './modal.js';
import { createRequire } from 'node:module';
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

	useEffect(() => {
		escExit();
	}, []);

	useEffect(() => {
		setRetrievedProcesses(filterProcesses(query, processes, flags));
	}, [query]);

	const handleReturnKey = (selectedProcess) => {
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
			setMessage(problemText);
			setModalOpened(true);
			setSurvivedProcesses(didSurvive);
		}
	};

	const killProcessForce = async (query) => {
		if (query === 'Y' && survivedProcesses.length > 0) {
			await fkill(survivedProcesses, {
				force: true,
				ignoreCase: true,
			});
		}

		process.exit(0);
	};

	const renderEmpty = () => {
		return (
			<Box marginLeft={2}>
				<Text color="#FF8000">No results...</Text>
			</Box>
		);
	};

	const renderHeader = () => {
		return (
			<Box>
				<Box marginRight={1}>
					<Text bold>
						<Text color="green">{`? `}</Text>
						<Text>Running processes:</Text>
					</Text>
				</Box>

				<TextInput
					value={query}
					onChange={(val) => {
						if (hasAnsi(val)) return;
						setQuery(val);
					}}
					focus={!modalOpened}
					placeholder={"Use arrow keys or type to search"}
				/>
			</Box>
		);
	};

	const renderProcessItem = ({isSelected, label}) => {
		return <Text color={isSelected ? "#00FFFF" : ""}>{label}</Text>
	};

	const renderIndicator = ({ isSelected }) => {
		return <Text color="#00FFFF">{isSelected ? "❯" : " "} </Text>;
	};

	const renderProcessList = () => {
		if (retrievedProcesses.length === 0) {
      return renderEmpty();
    }

    return (
			<SelectInput
				isFocused
				limit={PROCESS_LIST_MAX_COUNT}
				items={retrievedProcesses}
				onSelect={handleReturnKey}
				indicatorComponent={renderIndicator}
				itemComponent={renderProcessItem}
			/>
		);
  };

	const renderFooter = () => {
		return (
      <Box>
        <Text dimColor>(Move up and down to reveal more choices)</Text>
      </Box>
		);
	};

	return (
    <Box flexDirection="column">
			{renderHeader()}
			{!modalOpened && renderProcessList()}
			{!modalOpened && retrievedProcesses.length > 1 && renderFooter()}

			<Modal
				opened={modalOpened}
				inputPlaceholder={"(Y/n)"}
				message={message}
				selectHandler={killProcessForce}
			/>
    </Box>
	);
};

export {InteractiveUI};
