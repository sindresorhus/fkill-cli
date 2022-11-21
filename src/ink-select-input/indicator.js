import * as React from 'react';
import {Box, Text} from 'ink';
import * as figures from 'figures';

const Indicator = ({isSelected = false}) => (
	<Box marginRight={1}>
		{isSelected ? <Text color="blue">{figures.pointer}</Text> : <Text> </Text>}
	</Box>
);

export default Indicator;
