'use strict';
const {h, Component, Text} = require('ink');
const SelectInput = require('ink-select-input');
const TextInput = require('ink-text-input');
const cliTruncate = require('cli-truncate');
const escExit = require('esc-exit');
const numSort = require('num-sort');
const pidFromPort = require('pid-from-port');
const psList = require('ps-list');

const commandLineMargins = 4;

const nameFilter = (input, proc) => {
	const isPort = input[0] === ':';
	const field = isPort ? proc.port : proc.name;
	const keyword = isPort ? input.slice(1) : input;

	return field.toLowerCase().includes(keyword.toLowerCase());
};

const filterProcs = (input, procs, opts) => {
	const filters = {
		name: proc => input ? nameFilter(input, proc.value) : true,
		verbose: proc => input ? proc.value.cmd.toLowerCase().includes(input.toLowerCase()) : true
	};

	return procs.filter(opts.verbose ? filters.verbose : filters.name);
};

const mapProcs = (procs, opts) => procs
	.filter(proc => !(
		proc.name.endsWith('-helper') ||
		proc.name.endsWith('Helper') ||
		proc.name.endsWith('HelperApp')
	))
	.sort((a, b) => numSort.asc(a.pid, b.pid))
	.map(proc => {
		const lineLength = process.stdout.columns || 80;
		const margins = commandLineMargins + proc.pid.toString().length + proc.port.length;
		const length = lineLength - margins;
		const name = cliTruncate(opts.verbose ? proc.cmd : proc.name, length, {position: 'middle'});
		const port = proc.port && `:${proc.port}`;

		return {
			label: <Text>{name} <Text dim>{proc.pid}</Text> <Text dim magenta>{port}</Text></Text>,
			value: proc
		};
	});

const init = opts => {
	escExit();

	const getPortFromPid = (val, list) => {
		for (const x of list.entries()) {
			if (val === x[1]) {
				return String(x[0]);
			}
		}

		return '';
	};

	return Promise.all([pidFromPort.list(), psList({all: false})])
		.then(res => res[1].map(x => Object.assign(x, {port: getPortFromPid(x.pid, res[0])})))
		.then(procs => mapProcs(procs, opts));
};

module.exports = class extends Component {
	constructor(props) {
		super(props);
		this.handleChange = this.handleChange.bind(this);
		this.state = {
			input: '',
			procs: []
		};
	}

	componentDidMount() {
		init(this.props).then(procs => {
			this.setState(state => Object.assign(state, {procs}));
		});
	}

	handleChange(value) {
		this.setState(state => Object.assign(state, {input: value}));
	}

	render() {
		const {input, procs} = this.state;
		const items = filterProcs(input, procs, this.props);

		return (
			<div>
				<div><TextInput value={input} onChange={this.handleChange}/></div>
				<SelectInput items={items}/>
			</div>
		);
	}
};
