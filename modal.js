import React, { useState } from 'react';
import {Box, Text} from 'ink';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TextInput = require('ink-text-input').default;

const Modal = ({opened, inputPlaceholder, message, selectHandler}) => {
	const [query, setQuery] = useState('');

	if (!opened) return <></>;
	return (
		<Box marginTop={1} marginRight={1}>
			<Text bold>
				<Text color="green">{`? `}</Text>
				<Text>{message}</Text>
			</Text>

			<TextInput
				value={query}
				onChange={setQuery}
				placeholder={inputPlaceholder}
				onSubmit={() => selectHandler(query)}
			/>
		</Box>
	);
};

export { Modal };
