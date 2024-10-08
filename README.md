[![Light Protocol](assets/logo.svg)](https://lightprotocol.com)

# Light Protocol

[![Discord](https://img.shields.io/discord/892771619687268383?label=discord&logo=discord)](https://discord.gg/WDAAaX6je2)
[![Workflow Status](https://github.com/Lightprotocol/light-protocol-onchain/workflows/programs-test/badge.svg)](https://github.com/Lightprotocol/light-poseidon/actions?query=workflow)

**The ZK Layer for Solana**

Light is a zkLayer enabling stateless program execution, purpose-built for Solana.

Developers can use Light to...

- reduce the cost of state on the Solana L1.
- build zk applications that compose with Light state such as
  - offchain orderbooks
  - zk-coprocessors
  - zk-identity

Note: All these tools and the protocol are in active development and unaudited.
To work with this Monorepo, read below:

The documentation is available here: https://github.com/Lightprotocol/developer-content/tree/main/docs.

## Development environment

There are three ways of setting up the development environment:

- [devenv.sh script](#devenv.sh) - the most recommended one, both for Linux and
  macOS. Works with Bash and zsh.
- [Development Containers](#development-containers) - recommended on Linux,
  unfortunately has performance problems on macOS.
- [Manual setup](#manual-setup) - not recommended, but may be useful if the
  methods above don't work for you.

### devenv.sh

The easiest way to setup the development environment is to use our scripts
and development environment.

First, install the dependencies (they will be installed in the `.local`
directory inside your repository clone).

```
./scripts/install.sh
```

Then, activate the development environment:

```
./scripts/devenv.sh
```

Then follow the sections below, which describe the usage of `build.sh` and
`test.sh` scripts.

When the development environment is active, you can manually run commands
like `pnpm`, `cargo`, `solana`, `solana-test-validator`. They are going to
use the dependencies installed in `.local` directory, so even if you have
different global installations, they are not going to interfere.

### Development Containers

Light Protocol fully embraces [Development Containers](https://containers.dev/),
providing a ready-to-use
[Docker container image](https://github.com/Lightprotocol/dockerfiles/pkgs/container/devcontainer)
that comes pre-configured with all necessary dependencies for building and testing.

Support for Development Containers (either native or through a plugin) is
provided by the following IDEs and editors:

- [Visual Studio Code](https://code.visualstudio.com/docs/devcontainers/containers)
- [Neovim](https://github.com/esensar/nvim-dev-container)
- [Emacs](https://github.com/emacs-lsp/lsp-docker)

### Manual setup

If you still want to setup dependencies manually, these are the requirements:

- [Rust installed with Rustup](https://rustup.rs/), stable and nightly toolchains
- [NodeJS](https://nodejs.org/) [(16.16 LTS)](https://nodejs.org/en/blog/release/v16.16.0)
- [Anchor](https://www.anchor-lang.com/) [(0.26.0)](https://crates.io/crates/anchor-cli/0.26.0)

If you are using Ubuntu and encounter errors during the build process, you may need to install additional dependencies. Use the following command:

```
sudo apt install build-essential autoconf automake libtool zlib1g-dev pkg-config libssl-dev
```

## Building

To build the project, use the following commands:

```bash
./scripts/build.sh
```

## Solana keypair

Before doing any development or running any tests, you need to generate a new
local keypair:

```bash
solana-keygen new -o ~/.config/solana/id.json
```

## Tests

### Global

```bash
./scripts/test.sh
```

### Rust tests

```bash
cd light-verifier-sdk/
RUST_MIN_STACK=8388608 cargo test
```

### SDK tests

```bash
cd js/stateless.js
pnpm test
```

### Circuit tests

```bash
cd light-circuits
pnpm test
```

### Anchor tests

Tests are located in `tests/` directory.

The default test is a functional test, setting up a test environment with a
Merkle tree and an spl token, conducting two compressions and decompressions.

Tests can be executed in bulk or one by one.

```bash
anchor test
```

## Common errors

If you're seeing this error:

- ``error: package `solana-program v1.16.4` cannot be built because it requires rustc 1.68.0 or newer, while the currently active rustc version is 1.65.0-dev``

update your solana-cli version to >=1.16.4.

For more support from the community and core developers, open a GitHub issue or join the Light Protocol
Discord: [https://discord.gg/x4nyjT8fK5](https://discord.gg/x4nyjT8fK5)
