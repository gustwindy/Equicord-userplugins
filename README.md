# [<img src="./browser/icon.png" width="40" align="left" alt="Equicord">](https://github.com/Equicord/Equicord) Equicord (Fork)

Equicord is a fork of [Vencord](https://github.com/Vendicated/Vencord).

Plugin list is [here](https://github.com/gustwindy/Equicord-userplugins/tree/main/src/userplugins)

Looking for the vesktop of this fork? [Here](https://github.com/gustwindy/Equibop).

## Installing / Uninstalling

Windows

- [GUI](https://github.com/Equicord/Equilotl/releases/latest/download/Equilotl.exe)
- [CLI](https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli.exe)

MacOS

- [X64 GUI](https://github.com/Equicord/Equilotl/releases/latest/download/Equilotl-darwin-x64.zip)
- [ARM64 GUI](https://github.com/Equicord/Equilotl/releases/latest/download/Equilotl-darwin-arm64.zip)

Linux

- [GUI](https://github.com/Equicord/Equilotl/releases/latest/download/Equilotl-x11)
- [CLI](https://github.com/Equicord/Equilotl/releases/latest/download/EquilotlCli-Linux)
- [AUR](https://aur.archlinux.org/packages?O=0&K=equicord)

```shell
bash -c "$(curl -sS https://raw.githubusercontent.com/Equicord/Equicord/refs/heads/main/misc/install.sh)"
```

## Installing Equicord Devbuild

### Dependencies

[Git](https://git-scm.com/download) and [Node.JS LTS](https://nodejs.dev/en/) are required.

Install `pnpm`:

> :exclamation: This next command may need to be run as admin/root depending on your system, and you may need to close and reopen your terminal for pnpm to be in your PATH.

```shell
npm i -g pnpm
```

> :exclamation: **IMPORTANT** Make sure you aren't using an admin/root terminal from here onwards. It **will** mess up your Discord/Equicord instance and you **will** most likely have to reinstall.

Clone Equicord:

```shell
git clone https://github.com/Equicord/Equicord
cd Equicord
```

Install dependencies:

```shell
pnpm install --frozen-lockfile
```

Build Equicord:

```shell
pnpm build
```

Inject Equicord into your desktop client:

```shell
pnpm inject
```

Build Equicord for web:

```shell
pnpm buildWeb
```

After building Equicord's web extension, locate the appropriate ZIP file in the `dist` directory and follow your browser’s guide for installing custom extensions, if supported.

Note: Firefox extension zip requires Firefox for developers

## Credits

Thank you to [Vendicated](https://github.com/Vendicated) for creating [Vencord](https://github.com/Vendicated/Vencord) & [Suncord](https://github.com/verticalsync/Suncord) by [verticalsync](https://github.com/verticalsync) for helping when needed.