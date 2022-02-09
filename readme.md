<h1 align="center">
	<br>
	<img width="360" src="https://cdn.jsdelivr.net/gh/sindresorhus/fkill@913dce9ae670cd12410f6a64eaf94d7e5f50ed69/media/logo.svg" alt="fkill">
	<br>
	<br>
	<br>
</h1>

> Fabulously kill processes. Cross-platform.

Works on macOS, Linux, and Windows.

<br>

---

<div align="center">
	<p>
		<p>
			<sup>
				<a href="https://github.com/sponsors/sindresorhus">My open source work is supported by the community</a>
			</sup>
		</p>
		<sup>Special thanks to:</sup>
		<br>
		<br>
		<a href="https://bit.io/?utm_campaign=github_repo&utm_medium=referral&utm_content=fkill-cli&utm_source=github">
			<div>
				<img src="https://sindresorhus.com/assets/thanks/bitio-logo.svg" width="190" alt="bit.io">
			</div>
			<b>Instant, shareable cloud PostgreSQL database</b>
			<div>
				<sup>Import any dataset in seconds, share with anyone with a click, try without signing up</sup>
			</div>
		</a>
	</p>
</div>

---

<br>

## Install

```sh
npm install --global fkill-cli
```

## Usage

```
$ fkill --help

	Usage
		$ fkill [<pid|name|:port> …]

	Options
		--force, -f                  Force kill
		--verbose, -v                Show process arguments
		--silent, -s                 Silently kill and always exit with code 0
		--force-timeout <N>, -t <N>  Force kill processes which didn't exit after N seconds

	Examples
		$ fkill 1337
		$ fkill safari
		$ fkill :8080
		$ fkill 1337 safari :8080
		$ fkill

	To kill a port, prefix it with a colon. For example: :8080.

	Run without arguments to use the interactive interface.
	In interactive mode, 🚦n% indicates high CPU usage and 🐏n% indicates high memory usage.
	Supports fuzzy search in the interactive mode.

	The process name is case insensitive.
```

## Interactive UI

Run `fkill` without arguments to launch the interactive UI.

![](screenshot.svg)

## Related

- [fkill](https://github.com/sindresorhus/fkill) - API for this module
- [alfred-fkill](https://github.com/SamVerschueren/alfred-fkill) - Alfred workflow for this module

## Maintainers

- [Sindre Sorhus](https://sindresorhus.com)
- [Daniel Baker](https://github.com/coffeedoughnuts)
