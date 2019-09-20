import * as ChildProcess from 'child_process';
import * as Path from 'path';

import {BoringCache} from 'boring-cache';
import * as FSE from 'fs-extra';
import getPort from 'get-port';
import uuid from 'uuid';
import * as v from 'villa';

import {
  CreateWorkspaceOptions,
  WorkspaceMetadata,
  WorkspaceStatus,
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
    this.authorizedKeysFile
      .update()
      .then(() => this.dockerComposeUpdate())
      .catch(console.error);
  }

  get workspaceStatuses(): WorkspaceStatus[] {
    return this.storage.list('workspaces').map(
      (metadata): WorkspaceStatus => {
        return {
          ...metadata,
          ready: FSE.existsSync(Path.join('workspaces', metadata.id, '.ready')),
        };
      },
    );
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

  async retrieveWorkspaceLog(id: string): Promise<string> {
    let logProcess = ChildProcess.spawn('docker', [
      'logs',
      '--timestamps',
      `${this.config.name}_${id}_1`,
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

  private async dockerComposeUpdate(): Promise<void> {
    let workspaces = this.workspaces;

    return (this.dockerComposeUpPromise = this.dockerComposeUpPromise
      .then(async () => {
        await this.dockerComposeFile.update(workspaces);

        await this.dockerComposeUp();

        await this.dockerComposeFile.prune(workspaces);
      })
      .catch(console.error));
  }

  private async dockerComposeUp(): Promise<void> {
    console.info('Updating containers...');

    let composeProcess = ChildProcess.spawn(
      'docker-compose',
      [
        '--project-name',
        this.config.name,
        'up',
        '--detach',
        '--remove-orphans',
      ],
      {
        cwd: this.dockerComposeFile.dir,
      },
    );

    composeProcess.stdout.pipe(process.stdout);
    composeProcess.stderr.pipe(process.stderr);

    await v.awaitable(composeProcess);
  }
}
