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

// tslint:disable-next-line: no-var-requires no-require-imports
const {version} = require('../../package.json') as {version: string};

const config = new Config('remote-workspace.config.json');

const sshConfig = new SSHConfig({
  remoteHost: config.remoteHost,
  filePath: config.sshConfigFilePath,
});

const vscodeStorage = new VSCodeStorage();

let tunnelProcess: ChildProcess.ChildProcess | undefined;

main(async () => {
  const apiServer = new Server({
    port: config.port,
  });

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
    method: 'POST',
    path: '/api/switch-tunnel',
    handler({payload}, h) {
      let {workspace} = payload as {
        workspace: WorkspaceStatus;
      };

      if (workspace) {
        let {ready} = workspace;

        if (ready) {
          if (tunnelProcess) {
            tunnelProcess.kill('SIGINT');
            tunnelProcess = undefined;
          }

          let REG_STRING_IPV4 =
            '(?:([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])';
          let REG_STRING_PORT =
            '(?:[0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])';
          let REG_SSH_LOCAL_FORWARD = new RegExp(
            `${REG_STRING_IPV4}\\:${REG_STRING_PORT}\\:${REG_STRING_IPV4}\\:${REG_STRING_PORT}`,
          );

          let sshLocalForwardConfigs = _.union(
            ...workspace.projects.map(({ssh: {configs = []} = {}}) => configs),
          )
            .map(config =>
              config.replace(/^LocalForward /, '').replace(/\s+/, ':'),
            )
            .filter(config => REG_SSH_LOCAL_FORWARD.test(config));

          let tmpArray: string[] = [];

          for (let sshLocalForwardConfig of sshLocalForwardConfigs) {
            tmpArray.push('-L');
            tmpArray.push(sshLocalForwardConfig);
          }

          tunnelProcess = ChildProcess.spawn(
            config.sshExecutable,
            [SSH_CONFIG_HOST(workspace), ...tmpArray],
            {
              detached: false,
              shell: false,
              stdio: 'ignore',
            },
          );

          tunnelProcess.unref();

          return {};
        } else {
          return h.response('This workspace is not ready.').code(400);
        }
      } else {
        return h.response('Something is wrong.').code(400);
      }
    },
  });

  apiServer.route({
    method: 'GET',
    path: '/api/untunnel',
    handler({}, h) {
      if (tunnelProcess) {
        tunnelProcess.kill('SIGINT');
        tunnelProcess = undefined;
        return {};
      }

      return h.response('The tunnel process has been killed!').code(400);
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
