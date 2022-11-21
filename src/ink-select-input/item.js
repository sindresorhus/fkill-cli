import * as React from 'react';
import {Text} from 'ink';

const Item = ({isSelected = false, label}) => (
	<Text color={isSelected ? 'blue' : undefined}>{label}</Text>
);

export default Item;
