import childProcess from 'child_process';
import test from 'ava';
import execa from 'execa';
import delay from 'delay';
import noopProcess from 'noop-process';
import processExists from 'process-exists';
import getPort from 'get-port';

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
	const pid = childProcess.spawn('node', ['fixture.js', port]).pid;
	await execa('./cli.js', ['--force', pid]);
	await noopProcessKilled(t, pid);
	t.is(await getPort(port), port);
});

test('error when process is not found', async t => {
	const err = await t.throws(execa('./cli.js', ['--force', 'notFoundProcess']));
	t.regex(err.message, /Killing process notFoundProcess failed: Process doesn't exist/);
});
