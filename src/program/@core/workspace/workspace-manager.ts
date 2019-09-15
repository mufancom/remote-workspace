import {EventEmitter} from 'events';

import {Workspace} from './workspace';

export class WorkspaceManager extends EventEmitter {
  readonly workspaces = [
    new Workspace({
      id: 'test-workspace',
      projects: [
        {
          name: 'makeflow-web',
          repository: 'git@gitlab.mufan.io:makeflow/makeflow-web.git',
          branch: '',
          initialize: 'yarn',
        },
      ],
      services: [
        {
          name: 'mongo',
          image: 'mongo',
        },
        {
          name: 'redis',
          image: 'redis',
        },
        {
          name: 'zookeeper',
          image: 'zookeeper',
        },
      ],
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
