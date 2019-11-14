#!/usr/bin/env node

import * as ChildProcess from 'child_process';

import 'villa/platform/node';

import H2O2 from '@hapi/h2o2';
import {Server} from '@hapi/hapi';
import chalk from 'chalk';
import findProcess from 'find-process';
import {getProxySettings} from 'get-proxy-settings';
import HttpProxyAgent from 'http-proxy-agent';
import _ from 'lodash';
import {main} from 'main-function';
import fetch from 'node-fetch';
import open from 'open';
import * as v from 'villa';

import {
  NEVER,
  WorkspaceStatus,
  groupWorkspaceProjectConfigs,
} from '../../bld/shared';

import {Config, SSHConfig, SSH_CONFIG_HOST, VSCodeStorage} from './@core';

// tslint:disable-next-line: no-var-requires no-require-imports
const {version} = require('../../package.json') as {version: string};

const config = new Config('remote-workspace.config.json');

const sshConfig = new SSHConfig({
  remoteHost: config.remoteHost,
  filePath: config.sshConfigFilePath,
});

const vscodeStorage = new VSCodeStorage();

let tunnelProcess: ChildProcess.ChildProcess | undefined;
let tunnelWorkspaceId: string | undefined;
let agent: HttpProxyAgent | undefined;

main(async () => {
  const apiServer = new Server({
    port: config.port,
  });

  let proxySettings = await getProxySettings();
  let httpProxyUrl =
    proxySettings && proxySettings.http && proxySettings.http.toString();

  if (httpProxyUrl) {
    console.info(`Using proxy ${httpProxyUrl}.`);
    agent = new HttpProxyAgent(httpProxyUrl);
  }

  await apiServer.register(H2O2);

  apiServer.route({
    method: 'GET',
    path: '/api/client-host-version',
    handler() {
      return {
        data: version,
      };
    },
  });

  apiServer.route({
    method: 'POST',
    path: '/api/launch',
    handler({payload}) {
      let {workspace, project: projectName} = payload as {
        workspace: WorkspaceStatus;
        project?: string;
      };

      let project =
        typeof projectName === 'string'
          ? workspace.projects.find(project => project.name === projectName)
          : undefined;

      let vscodeRemoteURI = `vscode-remote://ssh-remote+${SSH_CONFIG_HOST(
        workspace,
      )}`;

      let subprocess = ChildProcess.spawn(
        config.vscodeExecutable,
        project
          ? [
              '--folder-uri',
              `${vscodeRemoteURI}${`/root/workspace/${project.name}`}`,
            ]
          : ['--file-uri', vscodeRemoteURI],
        {
          detached: true,
          shell: true,
          stdio: 'ignore',
        },
      );

      subprocess.unref();

      switchTunnel(workspace);

      return {};
    },
  });

  apiServer.route({
    method: 'GET',
    path: '/api/workspaces',
    async handler() {
      let response = await fetch(`${config.remoteURL}/api/workspaces`, {agent});
      let result = (await response.json()) as {data?: WorkspaceStatus[]};

      let {data: workspaces} = result;

      if (workspaces) {
        sshConfig.update(workspaces);

        let vscodeProcesses = await findProcess('name', /[\\/]code(?:\.exe)?/i);

        if (!vscodeProcesses.length) {
          vscodeStorage.cleanUp(workspaces);
        }
      }

      return result;
    },
  });

  apiServer.route({
    method: 'POST',
    path: '/api/switch-tunnel',
    handler({payload}) {
      let {workspace} = payload as {
        workspace: WorkspaceStatus;
      };

      switchTunnel(workspace);

      return {};
    },
  });

  apiServer.route({
    method: 'GET',
    path: '/api/untunnel',
    handler({}) {
      untunnel();

      return {};
    },
  });

  apiServer.route({
    method: 'GET',
    path: '/api/workspace-id-of-active-tunnel',
    async handler() {
      return {
        data: tunnelWorkspaceId,
      };
    },
  });

  apiServer.route({
    method: '*',
    path: '/{rest*}',
    handler: {
      proxy: {
        passThrough: true,
        uri: `${config.remoteURL}{path}`,
        agent,
      },
    },
  });

  await apiServer.start();

  let url = `http://remote-workspace.localhost:${config.port}`;

  console.info(`Visit ${url} to manage workspaces...`);

  if (config.toLaunchBrowser) {
    await open(url);
  }

  return NEVER;

  function switchTunnel(workspace: WorkspaceStatus): void {
    if (tunnelWorkspaceId === workspace.id) {
      return;
    }

    let {forwards} = groupWorkspaceProjectConfigs(workspace);

    if (!forwards.length) {
      return;
    }

    untunnel();

    tunnelWorkspaceId = workspace.id;

    console.info(
      `\
Starting port forwarding for workspace ${workspace.displayName}:
${forwards
  .map(forward => `  ${forward.type} ${forward.source} ${forward.target}`)
  .join('\n')}`,
    );

    tunnelProcess = ChildProcess.spawn(
      config.sshExecutable,
      [
        '-N',
        ..._.flatMap(forwards, forward => [`-${forward.flag}`, forward.value]),
        SSH_CONFIG_HOST(workspace),
      ],
      {
        windowsHide: true,
        detached: false,
        shell: false,
        stdio: 'ignore',
      },
    );

    v.awaitable(tunnelProcess)
      .finally(() => {
        if (tunnelWorkspaceId === workspace.id) {
          tunnelProcess = undefined;
          tunnelWorkspaceId = undefined;
        }
      })
      .catch(error =>
        console.error(
          chalk.red('Tunnel process stops unexpectedly with error:\n'),
          error,
        ),
      );
  }

  function untunnel(): void {
    if (tunnelProcess) {
      tunnelProcess.kill('SIGINT');
      tunnelProcess = undefined;
      tunnelWorkspaceId = undefined;
    }
  }
});
