#!/usr/bin/env node

import * as ChildProcess from 'child_process';

import 'villa/platform/node';

import H2O2 from '@hapi/h2o2';
import {Server} from '@hapi/hapi';
import findProcess from 'find-process';
import _ from 'lodash';
import {main} from 'main-function';
import fetch from 'node-fetch';
import open from 'open';

import {NEVER, WorkspaceStatus} from '../../bld/shared';

import {Config, SSHConfig, SSH_CONFIG_HOST, VSCodeStorage} from './@core';

const config = new Config('remote-workspace.config.json');

const sshConfig = new SSHConfig({
  remoteHost: config.remoteHost,
  filePath: config.sshConfigFilePath,
});

const vscodeStorage = new VSCodeStorage();

main(async () => {
  const apiServer = new Server({
    port: config.port,
  });

  await apiServer.register(H2O2);

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

      return {};
    },
  });

  apiServer.route({
    method: 'GET',
    path: '/api/workspaces',
    async handler() {
      let response = await fetch(`${config.remoteURL}/api/workspaces`);
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
    method: '*',
    path: '/{rest*}',
    handler: {
      proxy: {
        passThrough: true,
        uri: `${config.remoteURL}{path}`,
      },
    },
  });

  await apiServer.start();

  let url = `http://remote-workspace.localhost:${config.port}`;

  console.info(`Visit ${url} to manage workspaces...`);

  await open(url);

  return NEVER;
});
