#!/usr/bin/env node

import * as ChildProcess from 'child_process';

import 'villa/platform/node';

import H2O2 from '@hapi/h2o2';
import {Server} from '@hapi/hapi';
import * as FSE from 'fs-extra';
import hypenate from 'hyphenate';
import _ from 'lodash';
import {main} from 'main-function';
import fetch from 'node-fetch';
import open from 'open';

import {
  NEVER,
  RawWorkspaceProjectGit,
  WorkspaceMetadata,
  WorkspaceStatus,
} from '../../bld/shared';

import {
  Config,
  generateCreatePullMergeRequestInfo,
  listPullMergeRequests,
} from './@core';
import {parseGitURL} from './@utils';

function SSH_CONFIG_HOST({displayName, port}: WorkspaceMetadata): string {
  return `${hypenate(displayName, {lowerCase: true}) ||
    'remote-workspace'}-${port}`;
}

const config = new Config('remote-workspace.config.json');

const gitHostToServiceConfigMap = config.gitHostToServiceConfigMap;

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
        // Update SSH config

        let remoteDevSSHConfigContent = `\
# remote-workspace:start

${workspaces
  .map(workspace => {
    let projectsConfigsContent = _.union(
      ...workspace.projects.map(({ssh: {configs = []} = {}}) => configs),
    )
      .map(config => `  ${config}\n`)
      .join('');

    return `\
Host ${SSH_CONFIG_HOST(workspace)}
  User root
  HostName ${config.remoteHost}
  HostkeyAlias remote-workspace-${config.remoteHost}
  ForwardAgent yes
  Port ${workspace.port}
${projectsConfigsContent}`;
  })
  .join('\n')}
# remote-workspace:end`;

        let sshConfigFilePath = config.sshConfigFilePath;
        let sshConfigContent = FSE.existsSync(sshConfigFilePath)
          ? FSE.readFileSync(sshConfigFilePath, 'utf8')
          : '';

        let replaced = false;

        let updatedSSHConfigContent = sshConfigContent.replace(
          /^# remote-workspace:start$[\s\S]*^# remote-workspace:end$/m,
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

        // Retrieve pull/merge request information

        let projectInfos = _.compact(
          _.uniqWith(
            _.compact(
              _.flattenDeep(
                workspaces.map(workspace =>
                  workspace.projects.map(({git: {url}}) => parseGitURL(url)),
                ),
              ),
            ),
            _.isEqual as () => boolean,
          ).map(info => {
            let service = gitHostToServiceConfigMap.get(info.host);

            return (
              service && {
                ...info,
                service,
              }
            );
          }),
        );

        let pullMergeRequestInfos = await listPullMergeRequests(projectInfos);

        return {
          data: workspaces.map(workspace => {
            return {
              ...workspace,
              projects: workspace.projects.map(project => {
                let {
                  url,
                  branch: targetBranch = 'master',
                  newBranch: sourceBranch = targetBranch,
                }: RawWorkspaceProjectGit = project.git;

                let urlInfo = parseGitURL(url);

                if (!urlInfo) {
                  return project;
                }

                let {host, project: projectPath} = urlInfo;

                let pullMergeRequestInfo = pullMergeRequestInfos.find(
                  info =>
                    info.host === host &&
                    info.project === projectPath &&
                    info.targetBranch === targetBranch &&
                    info.sourceBranch === sourceBranch,
                );

                if (pullMergeRequestInfo) {
                  let {id, url, state} = pullMergeRequestInfo;

                  return {
                    ...project,
                    git: {
                      ...project.git,
                      pullMergeRequest: {
                        text: `#${id}`,
                        url,
                        state,
                      },
                    },
                  };
                }

                let serviceConfig = gitHostToServiceConfigMap.get(host);

                let createPullMergeRequestInfo =
                  serviceConfig &&
                  generateCreatePullMergeRequestInfo(
                    host,
                    projectPath,
                    sourceBranch,
                    targetBranch,
                    serviceConfig,
                  );

                return {
                  ...project,
                  git: {
                    ...project.git,
                    pullMergeRequest: createPullMergeRequestInfo,
                  },
                };
              }),
            };
          }),
        };
      } else {
        return result;
      }
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
