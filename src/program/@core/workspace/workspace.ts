import * as ChildProcess from 'child_process';

import * as v from 'villa';

export interface RawWorkspaceProject {
  name: string;
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

  get projects(): RawWorkspaceProject[] {
    let {projects} = this.raw;
    return projects;
  }

  get volume(): string {
    return `workspace-${this.id}`;
  }

  async setup(): Promise<void> {
    await this.ensureProjects();
  }

  async teardown(): Promise<void> {}

  private async ensureProjects(): Promise<void> {
    for (let project of this.projects) {
      await v.awaitable(
        ChildProcess.spawn('ssh', [
          '-A',
          'localhost',
          '-p',
          '2222',
          './scripts/ensure-project.sh',
          project.name,
          project.repository,
          project.branch,
        ]),
      );
    }
  }
}
