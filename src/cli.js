#!/usr/bin/env node
import process from 'node:process';
import React from 'react';
import meow from 'meow';
import fkill from 'fkill';
import {render} from 'ink';
import {listAllProcesses} from './utilities.js';
import {InteractiveUI} from './interactive.js';
import {Dialog} from './dialog.js';

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
			alias: 'f',
		},
		verbose: {
			type: 'boolean',
			alias: 'v',
		},
		silent: {
			type: 'boolean',
			alias: 's',
		},
		forceAfterTimeout: {
			type: 'number',
			alias: 't',
		},
	},
});

(async () => {
	if (cli.input.length === 0) {
		const processes = await listAllProcesses();
		const app = render(<InteractiveUI processes={processes} flags={cli.flags}/>);
		await app.waitUntilExit();
	} else {
		const forceAfterTimeout = cli.flags.forceAfterTimeout === undefined ? undefined : cli.flags.forceAfterTimeout * 1000;
		const promise = fkill(cli.input, {...cli.flags, forceAfterTimeout, ignoreCase: true});

		if (!cli.flags.force) {
			try {
				await promise;
			} catch (error) {
				if (cli.flags.silent) {
					return;
				}

				if (error.message.includes('Could not find a process with port')) {
					console.error(error.message);
					process.exit(1);
				}

				const modalSelectHandler = async answer => {
					const processes = cli.input;
					const suffix = processes.length > 1 ? 'es' : '';

					if (process.stdout.isTTY === false) {
						console.error(`Error killing process${suffix}. Try \`fkill --force ${processes.join(' ')}\``);
						process.exit(1);
					}

					if (answer === 'Y') {
						await fkill(processes, {
							force: true,
							ignoreCase: true,
						});
					}

					process.exit(0);
				};

				await render(
					<Dialog
						opened
						inputPlaceholder="(Y/n)"
						message="Error killing process. Would you like to use the force? "
						selectHandler={modalSelectHandler}
					/>,
				).waitUntilExit();
			}
		}
	}
})();
