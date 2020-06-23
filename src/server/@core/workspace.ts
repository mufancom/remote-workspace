import {createHash} from 'crypto';

import {
  RawWorkspace,
  RawWorkspaceProject,
  RawWorkspaceService,
} from '../../../bld/shared';

import {Config} from './config';

export class Workspace {
  constructor(
    readonly raw: RawWorkspace,
    readonly port: number,
    private config: Config,
    public active = false,
  ) {}

  get hash(): string {
    return createHash('md5')
      .update(JSON.stringify(this.raw))
      .digest('hex');
  }

  get id(): string {
    let {id} = this.raw;
    return id;
  }

  get image(): string {
    let {image = this.config.image} = this.raw;
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
