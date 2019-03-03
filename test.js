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

const runPtyWithInputs = (cmd, args, opts, inputs) => {
	return new Promise((resolve, reject) => {
		let inputIndex = 0;
		let expectingPrint = false;
		var ptyProcess = pty.spawn(cmd, args, opts);
		ptyProcess.on('error', (err) => {
			if(err && err.code == 'EIO') {
				resolve();
			} else {
				reject(err);
			}
		});
		ptyProcess.on('data', (d) => {
			if(expectingPrint) {
				expectingPrint = false;
			}
			else{
				if(inputs[inputIndex] != null){
					ptyProcess.write(inputs[inputIndex]);
					expectingPrint = true;
				}
				inputIndex++;
			}
		});
		if(inputs[inputIndex] != null){
			ptyProcess.write(inputs[inputIndex]);
			expectingPrint = true;
		}
	});
};

test('interactive mode works', async t => {
	const port = await getPort();
	const {pid} = childProcess.spawn('node', ['fixture.js', port]);
	await runPtyWithInputs('node', ['./cli.js'], {
		name: 'xterm-color',
		cols: 80,
		rows: 30,
		cwd: process.cwd(),
		env: process.env,
	}, [
		null,
		`:${port}`,
		'\r\n',
	]);
	await noopProcessKilled(t, pid);
	t.is(await getPort({port}), port);
});
