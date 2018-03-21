import test from 'ava';
import execa from 'execa';
import delay from 'delay';
import noopProcess from 'noop-process';
import processExists from 'process-exists';

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
