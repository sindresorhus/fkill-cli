import React, {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from './ink-text-input/index.js';

const Dialog = ({opened, inputPlaceholder, message, selectHandler}) => {
	const [query, setQuery] = useState('');

	if (!opened) {
		return null;
	}

	return (
		<Box marginTop={1} marginRight={1}>
			<Text bold>
				<Text color="green">{'? '}</Text>
				<Text>{message}</Text>
			</Text>

			<TextInput
				value={query}
				placeholder={inputPlaceholder}
				onChange={setQuery}
				onSubmit={() => selectHandler(query)}
			/>
		</Box>
	);
};

export {Dialog};
