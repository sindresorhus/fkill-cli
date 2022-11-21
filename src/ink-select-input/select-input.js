
import * as React from 'react';
import {useState, useEffect, useRef, useCallback} from 'react';
import {Box, useInput} from 'ink';
import isEqual from 'lodash.isequal';
import {arrayRotate} from '../utilities.js';
import Indicator from './indicator.js';
import Item from './item.js';

const SelectInput = ({
	items = [],
	isFocused = true,
	initialIndex = 0,
	indicatorComponent = Indicator,
	itemComponent = Item,
	limit: customLimit,
	onSelect,
	onHighlight,
}) => {
	const [rotateIndex, setRotateIndex] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState(initialIndex);
	const hasLimit
		= typeof customLimit === 'number' && items.length > customLimit;
	const limit = hasLimit ? Math.min(customLimit, items.length) : items.length;

	const previousItems = useRef(items);

	useEffect(() => {
		if (
			!isEqual(
				previousItems.current.map(item => item.value),
				items.map(item => item.value),
			)
		) {
			setRotateIndex(0);
			setSelectedIndex(0);
		}

		previousItems.current = items;
	}, [items]);

	useInput(
		useCallback(
			(input, key) => {
				if (input === 'k' || key.upArrow) {
					const lastIndex = (hasLimit ? limit : items.length) - 1;
					const atFirstIndex = selectedIndex === 0;
					const nextIndex = hasLimit ? selectedIndex : lastIndex;
					const nextRotateIndex = atFirstIndex ? rotateIndex + 1 : rotateIndex;
					const nextSelectedIndex = atFirstIndex
						? nextIndex
						: selectedIndex - 1;

					setRotateIndex(nextRotateIndex);
					setSelectedIndex(nextSelectedIndex);

					const slicedItems = hasLimit
						? arrayRotate(items, nextRotateIndex).slice(0, limit)
						: items;

					if (typeof onHighlight === 'function') {
						onHighlight(slicedItems[nextSelectedIndex]);
					}
				}

				if (input === 'j' || key.downArrow) {
					const atLastIndex
						= selectedIndex === (hasLimit ? limit : items.length) - 1;
					const nextIndex = hasLimit ? selectedIndex : 0;
					const nextRotateIndex = atLastIndex ? rotateIndex - 1 : rotateIndex;
					const nextSelectedIndex = atLastIndex ? nextIndex : selectedIndex + 1;

					setRotateIndex(nextRotateIndex);
					setSelectedIndex(nextSelectedIndex);

					const slicedItems = hasLimit
						? arrayRotate(items, nextRotateIndex).slice(0, limit)
						: items;

					if (typeof onHighlight === 'function') {
						onHighlight(slicedItems[nextSelectedIndex]);
					}
				}

				if (key.return) {
					const slicedItems = hasLimit
						? arrayRotate(items, rotateIndex).slice(0, limit)
						: items;

					if (typeof onSelect === 'function') {
						onSelect(slicedItems[selectedIndex]);
					}
				}
			},
			[
				hasLimit,
				limit,
				rotateIndex,
				selectedIndex,
				items,
				onSelect,
				onHighlight,
			],
		),
		{isActive: isFocused},
	);

	const slicedItems = hasLimit
		? arrayRotate(items, rotateIndex).slice(0, limit)
		: items;

	return (
		<Box flexDirection="column">
			{slicedItems.map((item, index) => {
				const isSelected = index === selectedIndex;

				return (
					<Box key={item.key ?? item.value}>
						{React.createElement(indicatorComponent, {isSelected})}
						{React.createElement(itemComponent, {...item, isSelected})}
					</Box>
				);
			})}
		</Box>
	);
};

export default SelectInput;
