[![NPM Package](https://badge.fury.io/js/remote-workspace.svg)](https://www.npmjs.com/package/remote-workspace)
[![Build Status](https://travis-ci.org/makeflow/remote-workspace.svg?branch=master)](https://travis-ci.org/makeflow/remote-workspace)

# Remote Workspace

The `remote-workspace` package provides a simple solution for managing remote workspace containers based on features to be developed. It leverages the Visual Studio Code [Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack) pack, more specifically [Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh), hoping to deliver better development experience for rapid and sparse feature development.

![Screenshot](https://user-images.githubusercontent.com/970430/65326811-e440f700-dbe4-11e9-950f-0f4fd3cfed15.png)

## The reason behind

Doing code review on pull/merge requests diff pages is painful:

- Not until recently that GitLab made it easier to expand all code between diffs for code review. If you want to understand the context of the changed code, you had to expand multiple times to see the code around, and it's still an issue for GitHub.
- Even if you expanded the code around, you still need to function as human parser, type checker, and the runtime to make relevant/helpful code review. You can't just navigate around code, take advantages of types etc.

So, we usually don't use those diff pages for code review. Instead we use the development environment by sitting on the chair of the code owner.

This helps provide better code review quality, however it is still kind of painful:

- Switching between branches (during either development or code review) is not pleasant at all. And as we are trying to have smaller tasks (which means more branches), it gets even worse.
- People won't be happy pulling and building the work-in-progress branches for code review.
- I personally just don't want to switch for small parallel patches when I am working on a major refactoring.

After got adapted to VSCode remote development, we popped up with this idea: what about one remote workspace per pull/merge request? We were stuck on the `ForwardAgent` limit of the remote development extension, but after that got resolved, we put this thing back to table.

There are some important factors that lead us to this tool:

- We want (relatively) high-quality code review for every single pull/merge request.
- We want to make tasks smaller, and we are okay that the lifecycle of every single task gets longer as the result of repeated code review. But we want to keep the over-time effeciency by paralleling multiple tasks.
- We want to take advantages of the remote computing power and save our laptops with less fan noises.

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

- VSCode with Remote Development extension. Some of the folder names are hard-coded, you may want to use the stable version of the extension to avoid folder name mismatching.
- Node.js v10+ (we are using v12).

#### Usage

- Run `npm install --global remote-workspace`.
- Find or create a nice directory and create configuration file `remote-workspace.config.json`, you can find an example [here](./examples/mufan/client/).
- Run `remote-workspace` in that nice directory to start the client host.

## Adapted technical approaches

This package takes advantages of several techniques or tricks, and it would be nice to understand them to avoid related problems.

### Server

- It uses the `environment` option in `authorized_keys` for different users to commit changes to Git repository.
- It uses a referenced bare repository to speed up project cloning. It first created a bare repository if missing, and then clone the project with `--reference` option to the bare repository. Please don't delete branches or tags that are not created within your current workspace. See [git-clone](https://git-scm.com/docs/git-clone#Documentation/git-clone.txt---reference-if-ableltrepositorygt) for more information.
- It uses `docker-compose up`, does `docker-compose container prune --force` and `docker-compose network prune --force` on updates.

### Client

The client installation is required for the programmatically updating SSH configuration file (usually `.ssh/config`) and launching VSCode.

- It updates the SSH configuration file to make VSCode able to read configurations like `Port`, `HostkeyAlias` etc.
- Currently you still need to configure SSH port forwarding (check out the server example), we may introduce built-in port forwarding in the future.
- It relies on agent forwarding to access remote repositories, so please make sure local SSH Agent is working.

## License

MIT License.
