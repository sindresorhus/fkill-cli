import childProcess from 'node:child_process';
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

test('main', async t => {
	const {stdout} = await execa('./cli.js', ['--version']);
	t.true(stdout.length > 0);
});

test('pid', async t => {
	const pid = await noopProcess();
	await execa('./cli.js', ['--force', pid]);
	await noopProcessKilled(t, pid);
});

// To do:: Remove below if statement after this https://github.com/nodejs/node/issues/35503 Node issue is resolved.
if (process.platform === 'darwin') {
	test('fuzzy search', async t => {
		const pid = await noopProcess({title: '!noo00oop@'});
		await execa('./cli.js', ['o00oop@']);
		await noopProcessKilled(t, pid);
	});
}

test('kill from port', async t => {
	const port = await getPort();
	const {pid} = childProcess.spawn('node', ['fixture.js', port]);
	await execa('./cli.js', ['--force', pid]);
	await noopProcessKilled(t, pid);
});

test('error when process is not found', async t => {
	await t.throwsAsync(
		execa('./cli.js', ['--force', 'notFoundProcess']),
		{message: /Killing process notFoundProcess failed: Process doesn't exist/},
	);
});

test('force killing process at unused port throws error', async t => {
	await t.throwsAsync(
		execa('./cli.js', ['--force', ':1337']),
		{message: /Killing process :1337 failed: Process doesn't exist/},
	);
});

test('silently force killing process at unused port exits with code 0', async t => {
	const {exitCode} = await execa('./cli.js', ['--force', '--silent', ':1337']);
	t.is(exitCode, 0);
});
