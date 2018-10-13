<h1 align="center">
	<br>
	<img width="360" src="https://cdn.jsdelivr.net/gh/sindresorhus/fkill@913dce9ae670cd12410f6a64eaf94d7e5f50ed69/media/logo.svg" alt="fkill">
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

<a href="https://www.patreon.com/sindresorhus">
	<img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>


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
    $ fkill :8080
    $ fkill 1337 safari :8080
    $ fkill

  To kill a port, prefix it with a colon. For example: :8080.

  Run without arguments to use the interactive interface.
  The process name is case insensitive.
```


## Interactive UI

Run `fkill` without arguments to launch the interactive UI.

![](screenshot.gif)


## Related

- [fkill](https://github.com/sindresorhus/fkill) - API for this module
- [alfred-fkill](https://github.com/SamVerschueren/alfred-fkill) - Alfred workflow for this module


## Created by

- [Sindre Sorhus](https://sindresorhus.com)
- [Daniel Baker](https://github.com/coffeedoughnuts)


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
