"use strict";
const { h, Component, Indent, Text } = require("ink");
const autoBind = require("auto-bind");
const escExit = require("esc-exit");
const pidFromPort = require("pid-from-port");
const importJsx = require("import-jsx");
const AutoComplete = importJsx("./temp-component");
const fkill = require("fkill");

// status flag
const DEFAULT = 1;
const ERROR = -1;

//error message
const ErrorMessage = ({ msg }) => {
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
		this.state = {
			flags: props.flags,
			status: !props.error ? DEFAULT : ERROR,
			list: props.list.map(item => ({
				...item,
				label: `${item.name}  pid:${item.pid}`,
				value: item.pid
			})),
			searching: null
		};
	}

	componentDidMount() {}

	handleChange(input) {
		this.setState({
			searching: input
		});
	}

	handleSubmit(selectd) {
		//  process kill
		fkill(selectd)
			.then(() => {
         //successTips
			})
			.catch(() => handleFkillError(selectd));
	}

	handleFkillError() {
		const suffix = processes.length > 1 ? "es" : "";
		if (process.stdout.isTTY === false) {
		    this.setState({
					errMsg:`Error killing process${suffix}. Try \`fkill --force ${processes.join()}\``
				})
		}else{
			
		}
	}

	match(str) {
		const that = this;
		return function(item) {};
	}

	render() {
		//
		const { searching, list, status, errMsg } = this.state;
		if (status === -1) {
			//error
			const error = errMsg ? errMsg : props.error;
			return <ErrorMessage msg={error} />;
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
				/>
			</div>
		);
	}
}

module.exports = FkillUI;
