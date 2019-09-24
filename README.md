[![NPM Package](https://badge.fury.io/js/remote-workspace.svg)](https://www.npmjs.com/package/remote-workspace)
[![Build Status](https://travis-ci.org/makeflow/remote-workspace.svg?branch=master)](https://travis-ci.org/makeflow/remote-workspace)

# Remote Workspace

The `remote-workspace` package leverages the Visual Studio Code [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) pack, more specifically [Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh), to deliver smoother development experience with multiple setups in parallel.

![Screenshot](https://user-images.githubusercontent.com/970430/65522170-ef659100-df1c-11e9-9578-bf981fc44b95.png)

## What it does?

- Deploys docker containers on your mark, typically one workspace container (and related service containers) per Git branch.
- Manages local SSH configuration and launches Visual Studio Code for remote workspaces.

## Why does this matter?

Switching between branches of a relatively large project is painful and takes time, however:

- While your changes probably need some sort of feedback before get merged, it's likely that you would have to repeatedly switch between branches to make changes.
- Doing code review on diff pages eliminates the abilities provided by development environment. For notable changes, if you don't want to act as human parser, type checker and runtime at the same time, you'll have to pull down the work-in-progress branches, or to sit by the side of your colleague. Either way you or your colleague have to switch between branches.

## How to use

> Please understand there is little effort put into security concerns, use it within a trusted group of people and make sure it's not exposed to the internet.

The `remote-workspace` package provides two commands for server and client respectively: `remote-workspace-server` and `remote-workspace`.

### Server

#### Prerequisites

- Reasonably new `docker` and `docker-compose`.
- Node.js v10+ (we are using v12).

#### Usage

- Run `npm install --global remote-workspace`.
- Find or create a nice directory and create configuration file `remote-workspace.config.json` and related files, you can find an example [here](./examples/mufan/server/).
- Run `remote-workspace-server` in that nice directory to start the server.

> You can use tools like `pm2` to run it in background and make it start after server boots.

### Client

#### Prerequisites

- VSCode with Remote Development extension. Some of the related folder names are hard-coded, you may want to use the stable version of the extension to avoid folder name mismatching.
- SSH agent running with a valid identity.
- Node.js v10+ (we are using v12).

#### Usage

- Run `npm install --global remote-workspace`.
- Find or create a nice directory and create configuration file `remote-workspace.config.json`, you can find an example [here](./examples/mufan/client/).
- Run `remote-workspace` in that nice directory to start the client host.

## FAQ

- Is this tool Node.js specific?

  > No, but it is Git and VSCode specific.

- Who can connect the remote workspaces?

  > Currently any of the users you put into server-side configuration can connect to any of the remote workspaces.

- How do I access repositories from the remote workspace?

  > The tool initializes projects using `git.identityFile` in server-side configuration file; and uses forwarded SSH agent to pull/push when you are connected.

- How does Git know who is the author if multiple developers make commits from the same remote workspace?

  > The tool generates `authorized_keys` file with the `environment` option for different users, including `REMOTE_USER_NAME`, `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME` and `GIT_COMMITTER_EMAIL`.

- How does it speed up cloning projects?

  > It uses a referenced bare repository to speed up project cloning. It first creates a bare repository if not present, and then clones the project with `--reference` option. See [git-clone](https://git-scm.com/docs/git-clone#Documentation/git-clone.txt---reference-if-ableltrepositorygt) for more information.

- Does it do any risky Docker operation that might have impact to other Docker resources it's not aware of?

  > It currently uses `docker-compose up` to bring up containers under the configured project name (defaults to `remote-workspace`). And it does `docker-compose container prune --force` as well as `docker-compose network prune --force` on updates.

- Why do I need to run a client on my local machine?

  > The client manages your SSH configuration file, adds remote workspaces with proper `Host`, `Port`, `HostkeyAlias` and other configurations like project specific ones. It also spawns VSCode when you click project or workspace links.

## License

MIT License.
