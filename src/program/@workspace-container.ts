import assert from 'assert';
import * as ChildProcess from 'child_process';

import getPort from 'get-port';
import {Dict} from 'tslang';
import * as v from 'villa';

import {Workspace} from './@workspace';

export interface WorkspaceContainerOptions {
  port: number;
  env: Dict<string>;
}

export class WorkspaceContainer {
  private containerId: string | undefined;

  constructor(
    private workspace: Workspace,
    private options: WorkspaceContainerOptions,
  ) {}

  async start(): Promise<number> {
    let {env, port: containerPort} = this.options;

    let envArgs = Object.entries(env).flatMap(([key, value]) => [
      '--env',
      `${key}=${value}`,
    ]);

    let hostPort = await getPort();

    let dockerRunProcess = ChildProcess.spawn('docker', [
      'run',
      ...envArgs,
      '--volume',
      `${this.workspace}:/workspaces`,
      '--publish',
      `${hostPort}:${containerPort}`,
      'remote-dev',
    ]);

    let containerId = '';

    dockerRunProcess.stdout.on('data', buffer => {
      containerId += buffer;
    });

    await v.awaitable(dockerRunProcess);

    this.containerId = containerId;

    return hostPort;
  }

  async kill(): Promise<void> {
    let containerId = this.containerId!;

    assert(containerId, 'Container has not been successfully started yet');

    await v.awaitable(ChildProcess.spawn('docker', ['kill', containerId]));
  }
}
