import {EventEmitter} from 'events';

import {Workspace} from './workspace';

export class WorkspaceManager extends EventEmitter {
  readonly workspaces: Workspace[] = [
    new Workspace({
      id: 'test-workspace',
      projects: [],
      // services: [{name: 'mongo', image: 'mongo'}],
    }),
  ];

  constructor() {
    super();
  }
}

export interface WorkspaceManager {
  emit(event: 'update'): boolean;

  on(event: 'update', listener: () => void): this;
}
