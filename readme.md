<h1 align="center">
	<br>
	<img width="360" src="https://cdn.jsdelivr.net/gh/sindresorhus/fkill@913dce9ae670cd12410f6a64eaf94d7e5f50ed69/media/logo.svg" alt="fkill">
	<br>
	<br>
	<br>
</h1>

> Fabulously kill processes. Cross-platform.

Works on macOS, Linux, and Windows.

## Install

```
$ npm install --global fkill-cli
```

## Usage

```
$ fkill --help

  Usage
    $ fkill [<pid|name> …]

  Options
    --force -f    Force kill
    --verbose -v  Show process arguments
    --silent -s   Silently kill and always exit with code 0

  Examples
    $ fkill 1337
    $ fkill safari
    $ fkill :8080
    $ fkill 1337 safari :8080
    $ fkill

  To kill a port, prefix it with a colon. For example: :8080.

  Run without arguments to use the interactive interface.
  In interactive mode, 🚦n% indicates high CPU usage and 🐏n% indicates high memory usage.

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
