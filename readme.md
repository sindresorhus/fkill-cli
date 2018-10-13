<h1 align="center">
	<br>
	<img width="360" src="https://rawgit.com/sindresorhus/fkill/master/media/logo.svg" alt="fkill">
	<br>
	<br>
	<br>
</h1>

> Fabulously kill processes. Cross-platform.

[![Build Status](https://travis-ci.org/sindresorhus/fkill-cli.svg?branch=master)](https://travis-ci.org/sindresorhus/fkill-cli)

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

  Examples
    $ fkill 1337
    $ fkill safari
    $ fkill 1337 safari
    $ fkill

  Run without arguments to use the interactive interface.
  The process name is case insensitive.
```


## Interactive UI

Run `fkill` without arguments to launch the interactive UI.

![](screenshot.svg)


## Related

- [fkill](https://github.com/sindresorhus/fkill) - API for this module
- [alfred-fkill](https://github.com/SamVerschueren/alfred-fkill) - Alfred workflow for this module


## Created by

- [Sindre Sorhus](https://sindresorhus.com)
- [Daniel Baker](https://github.com/coffeedoughnuts)


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
