"use strict";

const { h, Text, Component } = require("ink");
const PropTypes = require("prop-types");
const isEqual = require("lodash.isequal");
const figures = require("figures");
const TextInput = require("ink-text-input");

const noop = () => {};

const Indicator = ({ isSelected }) => {
	if (!isSelected) {
		return " ";
	}

	return <Text blue>{`${figures.pointer} `}</Text>;
};

Indicator.propTypes = {
	isSelected: PropTypes.bool.isRequired
};

const Item = ({ isSelected, label }) => <Text blue={isSelected}>{label}</Text>;

Item.propTypes = {
	isSelected: PropTypes.bool.isRequired,
	label: PropTypes.string.isRequired
};

class Select extends Component {
	constructor(props) {
		super(props);

		this.state = {
			selectedIndex: 0,
			startInex: 0,
			endIndex: props.pageLimit
		};

		this.handleKeyPress = this.handleKeyPress.bind(this);
	}

	render(
		{ items, indicatorComponent, itemComponent, pageLimit },
		{ selectedIndex, page, startInex, endIndex }
	) {
		const currentItems = !pageLimit ? items : items.slice(startInex, endIndex);

		return currentItems.map((item, index) => {
			const isSelected = index === selectedIndex;

			return (
				<div key={item.value}>
					{h(indicatorComponent, { isSelected })}
					{h(itemComponent, { ...item, isSelected })}
				</div>
			);
		});
	}

	componentDidMount() {
		process.stdin.on("keypress", this.handleKeyPress);
	}

	componentWillUnmount() {
		process.stdin.removeListener("keypress", this.handleKeyPress);
	}

	componentWillReceiveProps(nextProps) {
		// if (!isEqual(this.props.items, nextProps.items) && this.state.pageLimit) {
		// 	this.setState({
		// 		selectedIndex: 0
		// 	});
		// }
	}

	handleKeyPress(ch, key) {
		const { items, focus, onSelect, pageLimit } = this.props;
		const { selectedIndex, page } = this.state;
		const length = items.length;

		if (focus === false) {
			return;
		}

		if (key.name === "up" || key.name === "k") {
			const lastIndex = length - 1;
			const prevIndex = selectedIndex - 1;
			const newState = {
				selectedIndex: prevIndex
			};

			if (pageLimit) {
				if (this.state.startInex - 1 % pageLimit === 0) {
					//prevPage
					newState.startInex = this.state.startInex - 1;
					newState.endIndex = this.state.endIndex - 1;
					newState.selectedIndex = selectedIndex;
				} else if (prevIndex === -1) {
					newState.selectedIndex = selectedIndex;
				}
			}

			this.setState(newState);
		}

		if (key.name === "down" || key.name === "j") {
			const nextIndex = selectedIndex + 1;
			const newState = {
				selectedIndex: nextIndex
			};

			if (pageLimit) {
				// nextPage
				if (nextIndex % pageLimit === 0) {
					newState.startInex = this.state.startInex + 1;
					newState.endIndex = this.state.endIndex + 1;
					newState.selectedIndex = selectedIndex;
				} else if (nextIndex === length) {
					newState.selectedIndex = selectedIndex;
				}
			}
			this.setState(newState);
		}

		if (key.name === "return") {
			onSelect(items[selectedIndex]);
		}
	}
}

Select.propTypes = {
	items: PropTypes.array,
	focus: PropTypes.bool,
	indicatorComponent: PropTypes.func,
	itemComponent: PropTypes.func,
	onSelect: PropTypes.func
};

Select.defaultProps = {
	items: [],
	focus: true,
	indicatorComponent: Indicator,
	itemComponent: Item,
	onSelect: noop
};

// Helpers -------------------------------------------------------------------
const not = a => !a;
const isEmpty = arr => arr.length === 0;
const getMatch = input => ({ label }) =>
	!input ||
	(input.length > 0 && label.toLowerCase().indexOf(input.toLowerCase()) > -1);

// AutoComplete --------------------------------------------------------------

const AutoComplete = ({
	value,
	placeholder,
	items,
	getMatch,
	onChange,
	onSubmit,
	indicatorComponent,
	itemComponent,
	pageLimit
}) => {
	const matches = items.filter(getMatch(value));
	const hasSuggestion = not(isEmpty(matches));

	return (
		<span>
			<div>
				<TextInput
					value={value ? value : ""}
					placeholder={placeholder}
					onChange={onChange}
				/>
			</div>
			{hasSuggestion && (
				<Select
					items={matches}
					onSelect={onSubmit}
					focus={hasSuggestion}
					indicatorComponent={indicatorComponent}
					itemComponent={itemComponent}
					pageLimit={pageLimit}
				/>
			)}
		</span>
	);
};

AutoComplete.propTypes = {
	value: PropTypes.string,
	placeholder: PropTypes.string,
	items: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			value: PropTypes.any.isRequired
		})
	),
	getMatch: PropTypes.func,
	onChange: PropTypes.func,
	onSubmit: PropTypes.func,
	indicatorComponent: PropTypes.func,
	itemComponent: PropTypes.func
};

AutoComplete.defaultProps = {
	value: "",
	placeholder: "",
	items: [],
	getMatch,
	onChange: noop,
	onSubmit: noop,
	indicatorComponent: Select.defaultProps.indicatorComponent,
	itemComponent: Select.defaultProps.itemComponent
};

module.exports = AutoComplete;
