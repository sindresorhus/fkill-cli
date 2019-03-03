import childProcess from 'child_process';
import test from 'ava';
import execa from 'execa';
import delay from 'delay';
import noopProcess from 'noop-process';
import processExists from 'process-exists';
import getPort from 'get-port';
import * as pty from 'node-pty';

const noopProcessKilled = async (t, pid) => {
	// Ensure the noop process has time to exit
	await delay(100);
	t.false(await processExists(pid));
};

test(async t => {
	const {stdout} = await execa('./cli.js', ['--version']);
	t.true(stdout.length > 0);
});

test('pid', async t => {
	const pid = await noopProcess();
	await execa('./cli.js', ['--force', pid]);
	await noopProcessKilled(t, pid);
});

test('kill from port', async t => {
	const port = await getPort();
	const {pid} = childProcess.spawn('node', ['fixture.js', port]);
	await execa('./cli.js', ['--force', pid]);
	await noopProcessKilled(t, pid);
	t.is(await getPort({port}), port);
});

test('error when process is not found', async t => {
	const error = await t.throws(execa('./cli.js', ['--force', 'notFoundProcess']));
	t.regex(error.message, /Killing process notFoundProcess failed: Process doesn't exist/);
});

const runPtyWithInputs = opts => {
	return new Promise((resolve, reject) => {
		let inputIndex = 0;
		let expectingPrint = false;
		let outputsReceived = 0;
		const ptyProcess = pty.spawn(opts.cmd, opts.args, opts.opts);
		setTimeout(() => {
			reject(new Error('timeout'));
			ptyProcess.kill();
		}, opts.timeout);

		const sendInputIfNeeded = () => {
			const input = opts.inputs[inputIndex];
			if (input) {
				ptyProcess.write(input);
				expectingPrint = true;
			}
			inputIndex++;
		};

		ptyProcess.on('error', err => {
			if (err && err.code === 'EIO') {
				resolve();
			} else {
				reject(err);
			}
		});
		ptyProcess.on('data', () => {
			outputsReceived++;
			const outputIndex = outputsReceived;
			setTimeout(() => {
				if (outputIndex === outputsReceived) {
					reject(new Error('output timeout'));
					ptyProcess.kill();
				}
			}, opts.outputTimeout);

			if (expectingPrint) {
				expectingPrint = false;
			} else {
				sendInputIfNeeded();
			}
		});
		if (opts.initialInput) {
			ptyProcess.write(opts.initialInput);
			expectingPrint = true;
		}
	});
};

test('interactive mode works', async t => {
	const port = await getPort();
	const {pid} = childProcess.spawn('node', ['fixture.js', port]);
	await runPtyWithInputs({
		cmd: 'node',
		args: ['./cli.js'],
		opts: {
			name: 'xterm-color',
			cols: 80,
			rows: 30,
			cwd: process.cwd(),
			env: process.env
		},
		inputs: [
			`:${port}`,
			'\r\n'
		],
		outputTimeout: 20000,
		timeout: 120000
	});
	await noopProcessKilled(t, pid);
	t.is(await getPort({port}), port);
});
