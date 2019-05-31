import * as ChildProcess from 'child_process';

import * as v from 'villa';

export interface RawWorkspaceProject {
  repository: string;
  branch: string;
  initialize: string;
}

export interface RawWorkspaceService {
  name: string;
  image: string;
}

export interface RawWorkspace {
  id: string;
  image?: string;
  projects: RawWorkspaceProject[];
  services?: RawWorkspaceService[];
}

export class Workspace {
  constructor(private raw: RawWorkspace) {}

  get id(): string {
    let {id} = this.raw;
    return id;
  }

  get image(): string {
    let {image = 'remote-dev'} = this.raw;
    return image;
  }

  get services(): RawWorkspaceService[] {
    let {services = []} = this.raw;
    return services;
  }

  get volume(): string {
    return `workspace-${this.id}`;
  }

  async setup(): Promise<void> {
    await this.ensureVolume();
  }

  async teardown(): Promise<void> {}

  private async ensureVolume(): Promise<void> {
    await v.awaitable(
      ChildProcess.spawn('docker', ['volume', 'create', '--name', this.volume]),
    );
  }
}
