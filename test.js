import childProcess from 'child_process';
import test from 'ava';
import pify from 'pify';

test(async t => {
	const stdout = await pify(childProcess.execFile)('./cli.js', ['--version'], {cwd: __dirname});
	t.true(stdout.trim().length > 0);
});
