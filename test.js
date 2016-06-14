import test from 'ava';
import execa from 'execa';

test(async t => {
	const {stdout} = await execa('./cli.js', ['--version'], {cwd: __dirname});
	t.true(stdout.length > 0);
});
