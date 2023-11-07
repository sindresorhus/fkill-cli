#!/usr/bin/env node
import process from 'node:process';
import meow from 'meow';
import fkill from 'fkill';

const cli = meow(`
	Usage
	  $ fkill [<pid|name|:port> …]

	Options
	  --force -f                         Force kill
	  --verbose -v                       Show process arguments
	  --silent -s                        Silently kill and always exit with code 0
	  --force-after-timeout <N>, -t <N>  Force kill processes which didn't exit after N seconds

	Examples
	  $ fkill 1337
	  $ fkill safari
	  $ fkill :8080
	  $ fkill 1337 safari :8080
	  $ fkill

	To kill a port, prefix it with a colon. For example: :8080.

	Run without arguments to use the interactive mode.
	In interactive mode, 🚦n% indicates high CPU usage and 🐏n% indicates high memory usage.
	Supports fuzzy search in the interactive mode.

	The process name is case insensitive.
`, {
	importMeta: import.meta,
	inferType: true,
	flags: {
		force: {
			type: 'boolean',
			shortFlag: 'f',
		},
		verbose: {
			type: 'boolean',
			shortFlag: 'v',
		},
		silent: {
			type: 'boolean',
			shortFlag: 's',
		},
		forceAfterTimeout: {
			type: 'number',
			shortFlag: 't',
		},
	},
});

if (cli.input.length === 0) {
	const interactiveInterface = await import('./interactive.js');
	interactiveInterface.init(cli.flags);
} else {
	const forceAfterTimeout = cli.flags.forceAfterTimeout === undefined ? undefined : cli.flags.forceAfterTimeout * 1000;
	const promise = fkill(cli.input, {...cli.flags, forceAfterTimeout, ignoreCase: true});

	if (!cli.flags.force) {
		try {
			await promise;
		} catch (error) {
			if (!cli.flags.silent) {
				if (error.message.includes('Could not find a process with port')) {
					console.error(error.message);
					process.exit(1);
				}

				const interactiveInterface = await import('./interactive.js');
				interactiveInterface.handleFkillError(cli.input);
			}
		}
	}
}
