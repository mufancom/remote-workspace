import * as ChildProcess from 'child_process';
import * as Path from 'path';

import {BoringCache} from 'boring-cache';
import * as FSE from 'fs-extra';
import getPort from 'get-port';
import _ from 'lodash';
import {CronJob} from 'cron';
import uuid from 'uuid';
import * as v from 'villa';

import {
  CreateWorkspaceOptions,
  RawWorkspaceProject,
  RawWorkspaceProjectGit,
  RawWorkspaceProjectInPlaceConfig,
  WorkspaceMetadata,
  WorkspaceStatus,
  WorkspaceStatusWithPullMergeRequestInfo,
} from '../../../../bld/shared';
import {gracefulReadJSONFile} from '../../../node-shared';
import {parseGitURL, spawn} from '../../@utils';
import {Config} from '../config';
import {Workspace} from '../workspace';

import {
  generateCreatePullMergeRequestInfo,
  listPullMergeRequests,
} from './@git-services';
import {WorkspaceFiles} from './@workspace-files';

export function PROJECT_CONFIG_PATH(
  config: Config,
  workspace: WorkspaceMetadata,
  project: RawWorkspaceProject,
): string {
  return Path.join(
    config.dir,
    'workspaces',
    workspace.id,
    project.name,
    'remote-workspace.json',
  );
}

function SERVICE_NAME(
  config: Config,
  workspaceId: string,
  serviceName?: string,
): string {
  return _.compact([config.name, workspaceId, serviceName]).join('_');
}

async function CONTAINER_ID_PROMISE(
  config: Config,
  workspaceId: string,
  serviceName?: string,
): Promise<string> {
  let dockerServiceName = SERVICE_NAME(config, workspaceId, serviceName);

  let {output: output1} = await spawn('docker', [
    'service',
    'ps',
    dockerServiceName,
    '--quiet',
  ]);
  let taskId = output1.trim().split('\n')[0];

  let {output: output2} = await spawn('docker', [
    'inspect',
    '--format',
    '{{ .Status.ContainerStatus.ContainerID }}',
    taskId,
  ]);
  return output2.trim().split('\n')[0];
}

export interface DaemonStorageData {
  workspaces?: WorkspaceMetadata[];
}

export class Daemon {
  readonly workspaceFiles = new WorkspaceFiles(this.config);

  private dockerComposeUpPromise = Promise.resolve();

  private schedulePromise = Promise.resolve();

  constructor(
    private config: Config,
    private storage: BoringCache<DaemonStorageData>,
  ) {
    this.init().catch(console.error);
  }

  private get workspaces(): Workspace[] {
    return this.storage
      .list('workspaces')
      .map(
        ({port, active, ...raw}) =>
          new Workspace(raw, port, this.config, active),
      );
  }

  async isWorkspaceReady(id: string): Promise<boolean> {
    return FSE.stat(
      Path.join(this.config.dir, 'workspaces', id, '.ready'),
    ).then(
      () => true,
      () => false,
    );
  }

  async isWorkspaceConnected(id: string): Promise<boolean> {
    let containerId = await CONTAINER_ID_PROMISE(this.config, id);

    let output: string;

    try {
      let result = await spawn('docker', [
        'exec',
        containerId,
        '/bin/bash',
        '-c',
        "netstat -tnpa | grep 'ESTABLISHED.*sshd' | wc -l",
      ]);

      output = result.output;
    } catch (error) {
      console.error(error);

      return false;
    }

    return Number(output) !== 0;
  }

  async getWorkspaceStatuses(): Promise<
    WorkspaceStatusWithPullMergeRequestInfo[]
  > {
    let gitHostToServiceConfigMap = this.config.gitHostToServiceConfigMap;

    let workspaces = await v.map(
      this.storage.list('workspaces'),
      async (metadata): Promise<WorkspaceStatus> => {
        let {active, notConnectedSince} = metadata;

        let deactivatesAt =
          active && notConnectedSince
            ? notConnectedSince + this.config.deactivateAfterDuration
            : undefined;

        return {
          ...metadata,
          projects: await v.map(
            metadata.projects,
            async (project): Promise<RawWorkspaceProject> => {
              return {
                ...project,
                ...(await this.getInPlaceProjectConfig(metadata, project)),
              };
            },
          ),
          ready: await this.isWorkspaceReady(metadata.id),
          deactivatesAt,
        };
      },
    );

    let projectInfos = _.compact(
      _.uniqWith(
        _.compact(
          _.flattenDeep(
            workspaces.map(workspace =>
              workspace.projects.map(({git: {url}}) => parseGitURL(url)),
            ),
          ),
        ),
        _.isEqual,
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

    return workspaces.map(workspace => {
      return {
        ...workspace,
        projects: workspace.projects.map(project => {
          let {
            url,
            branch: targetBranch = 'master',
            newBranch: sourceBranch = targetBranch,
          }: RawWorkspaceProjectGit = project.git;

          let urlInfo = parseGitURL(url);

          if (!urlInfo || targetBranch === sourceBranch) {
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
    });
  }

  async createWorkspace(options: CreateWorkspaceOptions): Promise<string> {
    let id = uuid();

    let workspacePortSet = new Set(
      this.workspaces.map(workspace => workspace.port),
    );

    let port: number;

    // tslint:disable-next-line: no-conditional-assignment
    while ((port = await getPort())) {
      if (!workspacePortSet.has(port)) {
        break;
      }
    }

    let metadata = {
      id,
      port,
      active: true,
      ...options,
    };

    this.storage.push('workspaces', metadata);

    await this.update();

    return id;
  }

  async activateWorkspace(id: string): Promise<void> {
    let metadata = this.storage
      .list('workspaces')
      .find(metadata => metadata.id === id);

    if (!metadata) {
      throw new Error(`Workspace ${id} not found`);
    }

    await this._activateWorkspace(metadata);
  }

  async deactivateWorkspace(id: string): Promise<string | undefined> {
    let metadata = this.storage
      .list('workspaces')
      .find(metadata => metadata.id === id);

    if (!metadata) {
      throw new Error(`Workspace ${id} not found`);
    }

    try {
      if (await this.isWorkspaceConnected(metadata.id)) {
        return 'This workspace is connected.';
      }
    } catch (error) {
      console.error(error);

      return undefined;
    }

    await this._deactivateWorkspace(metadata);

    return undefined;
  }

  async updateWorkspace(workspace: WorkspaceMetadata): Promise<void> {
    this.storage.pull('workspaces', ({id}) => id === workspace.id);

    this.storage.push('workspaces', workspace);

    await this.update();
  }

  async deleteWorkspace(id: string): Promise<void> {
    this.storage.pull('workspaces', metadata => metadata.id === id);

    await this.update();
  }

  async retrieveWorkspaceLog(id: string): Promise<string> {
    let config = this.config;

    let logProcess = ChildProcess.spawn('docker', [
      'logs',
      '--timestamps',
      await CONTAINER_ID_PROMISE(config, id),
    ]);

    let log = '';

    logProcess.stdout.on('data', data => {
      log += data;
    });

    logProcess.stderr.on('data', data => {
      log += data;
    });

    await v.awaitable(logProcess);

    return log
      .split('\n')
      .sort()
      .join('\n');
  }

  private async getInPlaceProjectConfig(
    workspace: WorkspaceMetadata,
    project: RawWorkspaceProject,
  ): Promise<RawWorkspaceProjectInPlaceConfig | undefined> {
    let configFilePath = PROJECT_CONFIG_PATH(this.config, workspace, project);

    return gracefulReadJSONFile<RawWorkspaceProjectInPlaceConfig>(
      configFilePath,
    );
  }

  private async update(): Promise<void> {
    let workspaces = this.workspaces;

    return (this.dockerComposeUpPromise = this.dockerComposeUpPromise
      .then(async () => {
        console.info('Updating workspace files...');

        await this.workspaceFiles.update(workspaces);

        await this.deploy();

        await this.workspaceFiles.prune(workspaces);

        console.info('Done.');
      })
      .catch(console.error));
  }

  private async _activateWorkspace(metadata: WorkspaceMetadata): Promise<void> {
    if (metadata.active) {
      return;
    }

    this.setActive(metadata, true);

    await this.update();
  }

  private async _deactivateWorkspace(
    metadata: WorkspaceMetadata,
  ): Promise<void> {
    if (!metadata.active) {
      return;
    }

    this.setActive(metadata, false);

    await this.update();
  }

  private setActive(metadata: WorkspaceMetadata, active: boolean): void {
    this.storage.pull('workspaces', ({id}) => id === metadata.id);

    this.storage.push('workspaces', {
      ...metadata,
      active,
    });
  }

  private setNotConnectedSince(
    metadata: WorkspaceMetadata,
    notConnectedSince: number | undefined,
  ): void {
    this.storage.pull('workspaces', ({id}) => id === metadata.id);

    this.storage.push('workspaces', {
      ...metadata,
      notConnectedSince,
    });
  }

  private setActiveAndNotConnectedSince(
    metadata: WorkspaceMetadata,
    active: boolean,
    notConnectedSince: number | undefined,
  ): void {
    this.storage.pull('workspaces', ({id}) => id === metadata.id);

    this.storage.push('workspaces', {
      ...metadata,
      active,
      notConnectedSince,
    });
  }

  private resetNotConnectedSince(metadata: WorkspaceMetadata): void {
    this.setNotConnectedSince(metadata, Date.now());
  }

  private checkAndUpdateNotConnectedSince(): void {
    this.schedulePromise = this.schedulePromise
      .then(async () => {
        let needToUpdate = false;

        await v.each(this.storage.list('workspaces'), async metadata => {
          let active = metadata.active;

          if (active) {
            if (await this.isWorkspaceConnected(metadata.id)) {
              if (metadata.notConnectedSince) {
                this.setNotConnectedSince(metadata, undefined);
              }

              return;
            }

            if (!metadata.notConnectedSince) {
              this.resetNotConnectedSince(metadata);

              return;
            }

            let deactivatedAt =
              metadata.notConnectedSince + this.config.deactivateAfterDuration;

            if (deactivatedAt <= Date.now()) {
              this.setActiveAndNotConnectedSince(metadata, false, undefined);

              needToUpdate = true;
            }
          }
        });

        if (needToUpdate) {
          await this.update();
        }
      })
      .catch(console.error);
  }

  private async deploy(): Promise<void> {
    let config = this.config;

    console.info('Deploying services...');

    let {errorOutput} = await spawn(
      'docker',
      ['stack', 'deploy', '--compose-file', 'docker-compose.yml', config.name],
      {
        cwd: config.dir,
      },
    );

    if (errorOutput) {
      console.error(errorOutput);
    }

    console.info('Deployment ends...');
  }

  private async init(): Promise<void> {
    await this.update();

    this.checkAndUpdateNotConnectedSince();

    let job = new CronJob('0 */5 * * * *', () => {
      this.checkAndUpdateNotConnectedSince();
    });

    job.start();
  }
}
