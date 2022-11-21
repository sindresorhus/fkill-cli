import React, {useState, useEffect} from 'react';
import {Text, useInput} from 'ink';
import chalk from 'chalk';
import {regexLastIndexOf} from '../utilities.js';

// Patched from https://github.com/vadimdemedes/ink-text-input
const TextInput = ({
	value: originalValue,
	placeholder = '',
	focus = true,
	mask,
	highlightPastedText = false,
	showCursor = true,
	onChange,
	onSubmit,
}) => {
	const [{cursorOffset, cursorWidth}, setState] = useState({
		cursorOffset: (originalValue || '').length,
		cursorWidth: 0,
	});

	const handleDeleteKeyPress = (input, key) => {
		let nextValue = value;

		if (key.delete) {
			nextValue = nextValue.slice(0, -1);

			if (nextValue !== originalValue) {
				onChange(nextValue);
			}

			return true;
		}

		if (key.meta && input === 'd') {
			if (cursorOffset >= value.length) {
				nextValue = '';
			} else {
				const closestWhitespaceIndex = regexLastIndexOf(nextValue, /\s+/g, cursorOffset);
				nextValue = value.slice(0, cursorOffset);

				if (closestWhitespaceIndex !== -1) {
					nextValue += value.slice(closestWhitespaceIndex);
				}
			}

			if (nextValue !== originalValue) {
				onChange(nextValue);
			}

			return true;
		}

		return false;
	};

	const handleWordMove = (input, key) => {
		if (!key.meta) {
			return false;
		}

		if (input !== 'b' && input !== 'f') {
			return false;
		}

		let nextCursorOffset = cursorOffset;

		if (input === 'b') {
			if (cursorOffset >= value.length) {
				nextCursorOffset = value.length - 1;
			}

			const closestWhitespaceIndex = regexLastIndexOf([...value].reverse().join(''), /\s+/g, value.length - nextCursorOffset - 1);
			nextCursorOffset = closestWhitespaceIndex === -1 ? 0 : value.length - closestWhitespaceIndex - 1;

			while (nextCursorOffset > 0 && value[nextCursorOffset - 1] !== ' ') {
				--nextCursorOffset;
			}
		} else if (input === 'f') {
			const closestWhitespaceIndex = regexLastIndexOf(value, /\s+/g, nextCursorOffset);
			nextCursorOffset = closestWhitespaceIndex === -1 ? value.length - 1 : closestWhitespaceIndex;
		}

		setState({
			cursorOffset: nextCursorOffset,
			cursorWidth,
		});

		return true;
	};

	useEffect(() => {
		setState(previousState => {
			if (!focus || !showCursor) {
				return previousState;
			}

			const newValue = originalValue || '';

			if (previousState.cursorOffset > newValue.length - 1) {
				return {
					cursorOffset: newValue.length,
					cursorWidth: 0,
				};
			}

			return previousState;
		});
	}, [originalValue, focus, showCursor]);

	const cursorActualWidth = highlightPastedText ? cursorWidth : 0;

	const value = mask ? mask.repeat(originalValue.length) : originalValue;
	let renderedValue = value;
	let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

	// Fake mouse cursor, because it's too inconvenient to deal with actual cursor and ansi escapes
	if (showCursor && focus) {
		renderedPlaceholder
			= placeholder.length > 0
				? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
				: chalk.inverse(' ');

		renderedValue = value.length > 0 ? '' : chalk.inverse(' ');

		let i = 0;

		for (const char of value) {
			renderedValue += i >= cursorOffset - cursorActualWidth && i <= cursorOffset ? chalk.inverse(char) : char;

			i++;
		}

		if (value.length > 0 && cursorOffset === value.length) {
			renderedValue += chalk.inverse(' ');
		}
	}

	useInput(
		(input, key) => {
			if (
				key.upArrow
				|| key.downArrow
				|| (key.ctrl && input === 'c')
				|| key.tab
				|| (key.shift && key.tab)
			) {
				return;
			}

			if (key.return) {
				if (onSubmit) {
					onSubmit(originalValue);
				}

				return;
			}

			let nextCursorOffset = cursorOffset;
			let nextValue = originalValue;
			let nextCursorWidth = 0;

			if (handleWordMove(input, key) || handleDeleteKeyPress(input, key)) {
				return;
			}

			if (key.leftArrow) {
				if (showCursor) {
					nextCursorOffset--;
				}
			} else if (key.rightArrow) {
				if (showCursor) {
					nextCursorOffset++;
				}
			} else if (key.backspace || key.delete) {
				if (cursorOffset > 0) {
					nextValue
						= originalValue.slice(0, cursorOffset - 1)
						+ originalValue.slice(cursorOffset, originalValue.length);

					nextCursorOffset--;
				}
			} else {
				nextValue
					= originalValue.slice(0, cursorOffset)
					+ input
					+ originalValue.slice(cursorOffset, originalValue.length);

				nextCursorOffset += input.length;

				if (input.length > 1) {
					nextCursorWidth = input.length;
				}
			}

			if (cursorOffset < 0) {
				nextCursorOffset = 0;
			}

			if (cursorOffset > originalValue.length) {
				nextCursorOffset = originalValue.length;
			}

			setState({
				cursorOffset: nextCursorOffset,
				cursorWidth: nextCursorWidth,
			});

			if (nextValue !== originalValue) {
				onChange(nextValue);
			}
		},
		{isActive: focus},
	);

	return (
		<Text>
			{placeholder
				? (value.length > 0
					? renderedValue
					: renderedPlaceholder)
				: renderedValue}
		</Text>
	);
};

export default TextInput;