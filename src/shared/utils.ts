import _ from 'lodash';

import {RawWorkspace} from './types';

export const NEVER = new Promise<never>(() => {});

export interface PortForwardingCommandLineArgs {
  flag: 'L' | 'R';
  value: string;
}

export interface GroupWorkspaceProjectConfigsResult {
  configs: string[];
  forwards: PortForwardingCommandLineArgs[];
}

export function groupWorkspaceProjectConfigs({
  projects,
}: RawWorkspace): GroupWorkspaceProjectConfigsResult {
  let configs = _.union(
    ...projects.map(project => (project.ssh && project.ssh.configs) || []),
  );

  let nonForwardingConfigs: string[] = [];
  let forwards: PortForwardingCommandLineArgs[] = [];

  for (let config of configs) {
    let groups = /^(LocalForward|RemoteForward)\s+([^:]+:\d+)\s([^:]+:\d+)\s*(?:$|#)/.exec(
      config,
    );

    if (groups) {
      let [, type, source, target] = groups;

      forwards.push({
        flag: type[0] as 'L' | 'R',
        value: `${source}:${target}`,
      });
    } else {
      nonForwardingConfigs.push(config);
    }
  }

  return {
    configs: nonForwardingConfigs,
    forwards,
  };
}
