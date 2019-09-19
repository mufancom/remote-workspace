import * as ChildProcess from 'child_process';

import 'villa/platform/node';

import H2O2 from '@hapi/h2o2';
import {Server} from '@hapi/hapi';
import * as FSE from 'fs-extra';
import hypenate from 'hyphenate';
import {main} from 'main-function';
import fetch from 'node-fetch';

import {
  NEVER,
  RawWorkspaceProject,
  WorkspaceMetadata,
  WorkspaceStatus,
} from '../../bld/shared';

import {Config} from './@core';

function SSH_CONFIG_HOST({displayName, port}: WorkspaceMetadata): string {
  return `${hypenate(displayName, {lowerCase: true}) || 'remote-dev'}-${port}`;
}

const config = new Config('remote-dev.config.json');

main(async () => {
  const apiServer = new Server({
    port: config.port,
  });

  await apiServer.register(H2O2);

  apiServer.route({
    method: 'POST',
    path: '/api/launch',
    handler({payload}) {
      let workspace = payload as WorkspaceStatus;

      let project = workspace.projects[0] as RawWorkspaceProject | undefined;

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
        let remoteDevSSHConfigContent = `\
# remote-dev:start

${workspaces
  .map(
    workspace => `\
Host ${SSH_CONFIG_HOST(workspace)}
  User root
  HostName ${config.remoteHost}
  HostkeyAlias remote-dev-${config.remoteHost}
  ForwardAgent yes
  Port ${workspace.port}`,
  )
  .join('\n\n')}

# remote-dev:end`;

        let sshConfigFilePath = config.sshConfigFilePath;
        let sshConfigContent = FSE.existsSync(sshConfigFilePath)
          ? FSE.readFileSync(sshConfigFilePath, 'utf8')
          : '';

        let replaced = false;

        let updatedSSHConfigContent = sshConfigContent.replace(
          /^# remote-dev:start$[\s\S]*^# remote-dev:end$/m,
          () => {
            replaced = true;
            return remoteDevSSHConfigContent;
          },
        );

        if (!replaced) {
          updatedSSHConfigContent += `\n${remoteDevSSHConfigContent}\n`;
        }

        if (updatedSSHConfigContent !== sshConfigContent) {
          FSE.outputFileSync(sshConfigFilePath, updatedSSHConfigContent);
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

  return NEVER;
});
