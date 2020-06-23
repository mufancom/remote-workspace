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
import {WorkspaceFiles, DockerComposeSetting} from './@workspace-files';

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

function isWorkspaceActive(
  metadata: WorkspaceMetadata,
  serviceSetting: DockerComposeSetting['services'],
): boolean {
  return _.compact([
    metadata.id,
    ...(metadata.services?.map(({name}) => `${metadata.id}_${name}`) || []),
  ]).every(
    serviceName =>
      serviceSetting[serviceName] &&
      serviceSetting[serviceName].deploy.replicas === 1,
  );
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
    let now = Date.now();

    return this.storage
      .list('workspaces')
      .map(
        ({port, deactivatesAt, ...raw}) =>
          new Workspace(
            raw,
            port,
            this.config,
            !!deactivatesAt && deactivatesAt > now,
          ),
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

    let {output} = await spawn('docker', [
      'exec',
      containerId,
      '/bin/bash',
      '-c',
      "netstat -tnpa | grep 'ESTABLISHED.*sshd' | wc -l",
    ]);

    return Number(output) !== 0;
  }

  async getWorkspaceStatuses(): Promise<
    WorkspaceStatusWithPullMergeRequestInfo[]
  > {
    let gitHostToServiceConfigMap = this.config.gitHostToServiceConfigMap;

    let workspaces = await v.map(
      this.storage.list('workspaces'),
      async (metadata): Promise<WorkspaceStatus> => {
        let deactivatesAt = metadata.deactivatesAt;

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
          active: !!deactivatesAt,
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
      ...options,
    };

    this.storage.push('workspaces', metadata);

    await this._activateWorkspaceContainers(metadata);

    await this.update();

    return id;
  }

  async activateWorkspaceContainers(id: string): Promise<void> {
    let metadata = this.storage
      .list('workspaces')
      .find(metadata => metadata.id === id);

    if (!metadata) {
      throw new Error(`Workspace ${id} not found`);
    }

    await this._activateWorkspaceContainers(metadata);
  }

  async stopWorkspaceContainers(id: string): Promise<string | undefined> {
    let metadata = this.storage
      .list('workspaces')
      .find(metadata => metadata.id === id);

    if (!metadata) {
      throw new Error(`Workspace ${id} not found`);
    }

    if (await this.isWorkspaceConnected(metadata.id)) {
      return 'This workspace is connected.';
    }

    await this._stopWorkspaceContainers(metadata);

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

  private async _activateWorkspaceContainers(
    metadata: WorkspaceMetadata,
  ): Promise<void> {
    await this.resetDeactivatesAt(metadata);

    await this.update();
  }

  private async _stopWorkspaceContainers(
    metadata: WorkspaceMetadata,
  ): Promise<void> {
    this.setDeactivatesAt(metadata, undefined);

    await this.update();
  }

  private setDeactivatesAt(
    metadata: WorkspaceMetadata,
    deactivatesAt: number | undefined,
  ): void {
    this.storage.pull('workspaces', ({id}) => id === metadata.id);

    this.storage.push('workspaces', {
      ...metadata,
      deactivatesAt,
    });
  }

  private resetDeactivatesAt(metadata: WorkspaceMetadata): void {
    let deactivatesAt = Date.now() + this.config.deactivateAfterDuration;

    this.setDeactivatesAt(metadata, deactivatesAt);
  }

  private checkAndUpdateDeactivatesAt(): void {
    this.schedulePromise = this.schedulePromise
      .then(async () => {
        let serviceSetting: DockerComposeSetting['services'];

        try {
          let dockerComposeSetting = await this.workspaceFiles.dockerComposeSettings();
          serviceSetting = dockerComposeSetting['services'];
        } catch (error) {
          serviceSetting = {};
        }

        let needToUpdate = false;

        await v.each(this.storage.list('workspaces'), async metadata => {
          let active = isWorkspaceActive(metadata, serviceSetting);

          if (active && (await this.isWorkspaceConnected(metadata.id))) {
            this.resetDeactivatesAt(metadata);

            return;
          }

          let deactivatesAt = metadata.deactivatesAt;

          if (!deactivatesAt) {
            if (active) {
              // When this project starts, it's likely that there'are already
              // some workspaces running.
              this.resetDeactivatesAt(metadata);
            } else {
              // The workspace is suspended.
            }

            return;
          }

          let now = Date.now();

          if (deactivatesAt <= now) {
            this.setDeactivatesAt(metadata, undefined);

            needToUpdate = true;
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

    this.checkAndUpdateDeactivatesAt();

    let job = new CronJob('0 */5 * * * *', () => {
      this.checkAndUpdateDeactivatesAt();
    });

    job.start();
  }
}
