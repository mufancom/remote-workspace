import * as ChildProcess from 'child_process';

import * as v from 'villa';

export interface WorkspaceProjectEntry {
  repository: string;
  branch: string;
  initialize: string;
}

export interface WorkspaceEntry {
  id: string;
  projects: WorkspaceProjectEntry[];
}

export class Workspace {
  constructor(private entry: WorkspaceEntry) {}

  private get volume(): string {
    let {id} = this.entry;
    return `workspace-${id}`;
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
