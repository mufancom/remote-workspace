import * as ChildProcess from 'child_process';

import {BoringCache} from 'boring-cache';
import getPort from 'get-port';
import uuid from 'uuid';
import * as v from 'villa';

import {
  CreateWorkspaceOptions,
  WorkspaceMetadata,
} from '../../../../bld/shared';
import {Config} from '../config';
import {AuthorizedKeysFile, DockerComposeFile} from '../generated-file';
import {Workspace} from '../workspace';

export interface DaemonStorageData {
  workspaces?: WorkspaceMetadata[];
}

export class Daemon {
  readonly authorizedKeysFile = new AuthorizedKeysFile(this.config);

  readonly dockerComposeFile = new DockerComposeFile(this.config);

  private dockerComposeUpPromise = Promise.resolve();

  constructor(
    private config: Config,
    private storage: BoringCache<DaemonStorageData>,
  ) {
    this.authorizedKeysFile.update();

    this.dockerComposeUpdate().catch(console.error);
  }

  private get workspaces(): Workspace[] {
    return this.storage
      .list('workspaces')
      .map(({port, ...raw}) => new Workspace(raw, port, this.config));
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

    this.storage.push('workspaces', {
      id,
      port,
      ...options,
    });

    await this.dockerComposeUpdate();

    return id;
  }

  async deleteWorkspace(id: string): Promise<void> {
    this.storage.pull('workspaces', metadata => metadata.id === id);

    await this.dockerComposeUpdate();
  }

  private async dockerComposeUpdate(): Promise<void> {
    this.dockerComposeFile.update(this.workspaces);

    return (this.dockerComposeUpPromise = this.dockerComposeUpPromise
      .then(() => this.dockerComposeUp())
      .catch(console.error));
  }

  private async dockerComposeUp(): Promise<void> {
    let composeProcess = ChildProcess.spawn(
      'docker-compose',
      ['--project-name', 'remote-dev', 'up', '--detach', '--remove-orphans'],
      {
        cwd: this.dockerComposeFile.dir,
      },
    );

    composeProcess.stdout.pipe(process.stdout);
    composeProcess.stderr.pipe(process.stderr);

    await v.awaitable(composeProcess);
  }
}