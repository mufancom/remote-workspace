import {
  RawWorkspace,
  RawWorkspaceProject,
  RawWorkspaceService,
} from '../../server-client';

export class Workspace {
  constructor(private raw: RawWorkspace, readonly port: number) {}

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
}
