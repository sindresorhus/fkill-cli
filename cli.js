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
	  --smart-case                       Case-insensitive unless pattern contains uppercase
	  --case-sensitive                   Force case-sensitive matching

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

	The process name is case-insensitive by default.
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
		smartCase: {
			type: 'boolean',
		},
		caseSensitive: {
			type: 'boolean',
		},
	},
});

const shouldIgnoreCase = (inputs, flags) => {
	// Explicit case-sensitive flag takes precedence over smart-case
	if (flags.caseSensitive) {
		return false;
	}

	// Smart-case: ignore case unless ANY input contains uppercase
	// Note: With multiple inputs, if ANY has uppercase, ALL are matched case-sensitively
	if (flags.smartCase) {
		const hasUpperCase = inputs.some(input => /[A-Z]/.test(String(input)));
		return !hasUpperCase;
	}

	// Default: always ignore case (maintains backward compatibility)
	return true;
};

if (cli.input.length === 0) {
	const interactiveInterface = await import('./interactive.js');
	interactiveInterface.init(cli.flags);
} else {
	const forceAfterTimeout = cli.flags.forceAfterTimeout === undefined ? undefined : cli.flags.forceAfterTimeout * 1000;
	const ignoreCase = shouldIgnoreCase(cli.input, cli.flags);
	const promise = fkill(cli.input, {...cli.flags, forceAfterTimeout, ignoreCase});

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
				interactiveInterface.handleFkillError(cli.input, cli.flags);
			}
		}
	}
}
