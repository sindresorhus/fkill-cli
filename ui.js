'use strict';
const {h, Component, Text} = require('ink');
const autoBind = require('auto-bind');
const escExit = require('esc-exit');
const fkill = require('fkill');
const ConfirmInput = require('ink-confirm-input');
const cliTruncate = require('cli-truncate');
const PropTypes = require('prop-types');

const AutoComplete = require('ink-power-auto-complete').default;

// Status flag
const DEFAULT = 1;
const CONFIRM = 2;
const ERROR = -1;

const commandLineMargins = 4;

// Util
function nameFilter(input, proc) {
	const isPort = input[0] === ':';
	const field = isPort ? proc.port : proc.name;
	const keyword = isPort ? input.slice(1) : input;

	return field.toLowerCase().includes(keyword.toLowerCase());
}

// Error message
const ErrorMessage = ({msg}) => {
	return (
		<Text bold red>
			{msg}
		</Text>
	);
};

class FkillUI extends Component {
	constructor(props) {
		super(props);
		autoBind(this);
		escExit();
		let status = DEFAULT;
		if (props.error) {
			status = ERROR;
		}
		if (props.selected) {
			status = CONFIRM;
		}
		this.state = {
			flags: props.flags,
			status,
			list: props.list.map(item => ({
				...item,
				label: `${item.name}  pid:${item.pid}`,
				value: item.pid
			})),
			searching: null,
			selectd: props.selected,
			confirmInput: ''
		};
	}

	handleChange(input) {
		this.setState({
			searching: input
		});
	}

	async handleSubmit(selectd) {
		this.setState({
			selectd
		});
		try {
			await fkill(selectd.pid);
			this.props.onExit();
		} catch (err) {
			this.handleFkillError(selectd);
		}
	}

	renderItem(proc, flags) {
		const lineLength = process.stdout.columns || 80;
		const margins = commandLineMargins + proc.pid.toString().length;
		const length = lineLength - margins;
		const name = cliTruncate(flags.verbose ? proc.cmd : proc.name, length, {
			position: 'middle'
		});
		const port = proc.port && `:${proc.port}`;
		return (
			<Text>
				{name} <Text dim>{proc.pid}</Text>{' '}
				<Text dim magenta>
					{port}
				</Text>
			</Text>
		);
	}

	handleFkillError(processes) {
		const suffix = processes.length > 1 ? 'es' : '';
		if (process.stdout.isTTY === false) {
			this.setState({
				errMsg: `Error killing process${suffix}. Try \`fkill --force ${processes.join()}\``
			});
		} else {
			this.setState({
				status: CONFIRM
			});
		}
	}

	itemsMatch(input) {
		const {flags} = this.state;
		return function (item) {
			let result = true;
			result = !(
				item.name.endsWith('-helper') ||
				item.name.endsWith('Helper') ||
				item.name.endsWith('HelperApp')
			);

			if (!result) {
				return result;
			}

			const filters = {
				name: proc => (input ? nameFilter(input, proc) : true),
				verbose: proc =>
					input ? proc.cmd.toLowerCase().includes(input.toLowerCase()) : true
			};

			const filter = flags.verbose ? filters.verbose : filters.name;

			return filter(item);
		};
	}

	handleConfirmChange(value) {
		this.setState({
			confirmInput: value
		});
	}

	async handleConfirmSubmit() {
		const value = this.state.confirmInput;
		if (value && value.toLowerCase() === 'y') {
			try {
				await fkill(this.state.selectd.pid, {
					force: true,
					ignoreCase: true
				});
			} catch (err) {
				this.setState({
					status: ERROR,
					errMsg: err.message
				});
			} finally {
				this.props.onExit();
			}
		}
	}

	render() {
		//
		const {searching, list, status, errMsg, flags, confirmInput} = this.state;
		if (status === ERROR) {
			// Error
			const error = errMsg ? errMsg : this.props.error;
			return <ErrorMessage msg={error}/>;
		}

		if (status === CONFIRM) {
			return (
				<div>
					Error killing process. Would you like to use the force? (Y/n)
					<ConfirmInput
						checked
						value={confirmInput}
						onChange={this.handleConfirmChange}
						onSubmit={this.handleConfirmSubmit}
					/>
				</div>
			);
		}

		return (
			<div>
				<Text>Running processes:</Text>
				<AutoComplete
					value={searching}
					placeholder="Type a process"
					items={list}
					onChange={this.handleChange}
					onSubmit={this.handleSubmit}
					pageLimit={10}
					getMatch={this.itemsMatch}
					itemComponent={items => this.renderItem(items, flags)}
				/>
			</div>
		);
	}
}

FkillUI.defaultProps = {
	list: [],
	selected: null
};

FkillUI.propTypes = {
	list: PropTypes.array,
	flags: PropTypes.object.isRequired,
	selected: PropTypes.object,
	onExit: PropTypes.func.isRequired
};

module.exports = FkillUI;
