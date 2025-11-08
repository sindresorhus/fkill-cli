import process from 'node:process';
import childProcess from 'node:child_process';
import test from 'ava';
import {execa} from 'execa';
import delay from 'delay';
import noopProcess from 'noop-process';
import {processExists} from 'process-exists';
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

// TODO: Upgrading AVA to latest caused this to not finish. Unclear why.
// test('fuzzy search', async t => {
// 	const pid = await noopProcess({title: '!noo00oop@'});
// 	await execa('./cli.js', ['o00oop@']);
// 	await noopProcessKilled(t, pid);
// });

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

// Case-sensitivity tests only work on Unix-like systems
// Windows process names work differently and don't support custom titles via noopProcess
if (process.platform !== 'win32') {
	test('default case-insensitive behavior', async t => {
		const pid = await noopProcess({title: 'DefaultCase'});
		await execa('./cli.js', ['--force', 'defaultcase']);
		await noopProcessKilled(t, pid);
	});

	test('case-sensitive flag makes matching case-sensitive', async t => {
		const pid = await noopProcess({title: 'CaseSensitive'});
		await t.throwsAsync(
			execa('./cli.js', ['--case-sensitive', '--force', 'casesensitive']),
			{message: /Killing process casesensitive failed/},
		);
		// Clean up the process
		await execa('./cli.js', ['--force', pid]);
	});

	test('smart-case with lowercase is case-insensitive', async t => {
		const pid = await noopProcess({title: 'SmartLower'});
		await execa('./cli.js', ['--smart-case', '--force', 'smartlower']);
		await noopProcessKilled(t, pid);
	});

	test('smart-case with uppercase is case-sensitive', async t => {
		const pid = await noopProcess({title: 'smartupper'});
		await t.throwsAsync(
			execa('./cli.js', ['--smart-case', '--force', 'SmartUpper']),
			{message: /Killing process SmartUpper failed/},
		);
		// Clean up the process
		await execa('./cli.js', ['--force', pid]);
	});
}

test('silent flag with -s shortflag works', async t => {
	const {exitCode} = await execa('./cli.js', ['-s', '--force', ':1337']);
	t.is(exitCode, 0);
});
