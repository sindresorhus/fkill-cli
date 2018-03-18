"use strict";
const { h, Component, Indent, Text } = require("ink");
const autoBind = require("auto-bind");
const escExit = require("esc-exit");
const pidFromPort = require("pid-from-port");
const importJsx = require("import-jsx");
const fkill = require("fkill");
const ConfirmInput = require("ink-confirm-input");
const cliTruncate = require("cli-truncate");
const AutoComplete = importJsx("./temp-component");

// status flag
const DEFAULT = 1;
const CONFIRM = 2;
const SUCCESS = 3;
const LOADING = 4;
const ERROR = -1;

const commandLineMargins = 4;

//util
function nameFilter(input, proc) {
	const isPort = input[0] === ":";
	const field = isPort ? proc.port : proc.name;
	const keyword = isPort ? input.slice(1) : input;

	return field.toLowerCase().includes(keyword.toLowerCase());
}

//error message
const ErrorMessage = ({ msg }) => {
	return (
		<Text bold red>
			{msg}
		</Text>
	);
};

//success message
const SuccessMessage = () => {
	return (
		<Text bold green>
			kill process successfully and auto exit
		</Text>
	);
};

class FkillUI extends Component {
	constructor(props) {
		super(props);
		autoBind(this);
		escExit();
		this.state = {
			flags: props.flags,
			status: !props.error ? DEFAULT : ERROR,
			list: props.list.map(item => ({
				...item,
				label: `${item.name}  pid:${item.pid}`,
				value: item.pid
			})),
			searching: null,
			selectd: props.killProcess,
			confirmInput: ""
		};
	}

	handleChange(input) {
		this.setState({
			searching: input
		});
	}

	handleSubmit(selectd) {
		this.setState({
			selectd
		});
		//  process kill
		fkill(selectd.pid)
			.then(() => {
				process.exit(1);
			})
			.catch(() => this.handleFkillError(selectd));
	}

	renderItem(proc, flags) {
		const lineLength = process.stdout.columns || 80;
		const margins = commandLineMargins + proc.pid.toString().length;
		const length = lineLength - margins;
		const name = cliTruncate(flags.verbose ? proc.cmd : proc.name, length, {
			position: "middle"
		});
		const port = proc.port && `:${proc.port}`;
		return (
			<Text>
				{name} <Text dim>{proc.pid}</Text>{" "}
				<Text dim magenta>
					{port}
				</Text>
			</Text>
		);
	}

	handleFkillError(processes) {
		const suffix = processes.length > 1 ? "es" : "";
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
		const { flags } = this.state;
		return function(item) {
			let result = true;
			result = !(
				item.name.endsWith("-helper") ||
				item.name.endsWith("Helper") ||
				item.name.endsWith("HelperApp")
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

	handleConfirmSubmit() {
		const value = this.state.confirmInput;
		if (value && value.toLowerCase() === "y") {
			fkill(this.state.selectd.pid, {
				force: true,
				ignoreCase: true
			})
				.then(() => {
					process.exit(1);
				})
				.catch(err => {
					this.setState({
						status: ERROR,
						errMsg: err.message
					});
				});
		}
	}

	render() {
		//
		const { searching, list, status, errMsg, flags, confirmInput } = this.state;
		if (status === ERROR) {
			//error
			const error = errMsg ? errMsg : props.error;
			return <ErrorMessage msg={error} />;
		}

		if (status === SUCCESS) {
			return <SuccessMessage />;
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
				<Text>{"Running processes: "}</Text>
				<AutoComplete
					value={searching}
					placeholder={"Type a process"}
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

module.exports = FkillUI;
