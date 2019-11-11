import * as FSE from 'fs-extra';
import hyphenate from 'hyphenate';
import _ from 'lodash';

import {
  WorkspaceMetadata,
  groupWorkspaceProjectConfigs,
} from '../../../bld/shared';

export function SSH_CONFIG_HOST({
  displayName,
  port,
}: WorkspaceMetadata): string {
  return `remote-workspace-${hyphenate(displayName, {lowerCase: true}) ||
    'remote-workspace'}-${port}`;
}

export interface SSHConfigOptions {
  remoteHost: string;
  filePath: string;
}

export class SSHConfig {
  private content: string | undefined;

  constructor(private options: SSHConfigOptions) {}

  update(workspaces: WorkspaceMetadata[]): void {
    let {remoteHost, filePath} = this.options;

    let remoteDevSSHConfigContent = `\
# remote-workspace:start

${workspaces
  .map(workspace => {
    let projectsConfigsContent = groupWorkspaceProjectConfigs(workspace)
      .configs.map(config => `  ${config}\n`)
      .join('');

    return `\
Host ${SSH_CONFIG_HOST(workspace)}
  User root
  HostName ${remoteHost}
  HostkeyAlias remote-workspace-${remoteHost}
  ForwardAgent yes
  Port ${workspace.port}
${projectsConfigsContent}`;
  })
  .join('\n')}
# remote-workspace:end`;

    let sshConfigContent = this.load(true);

    let replaced = false;

    let updatedSSHConfigContent = sshConfigContent.replace(
      /^# remote-workspace:start$[\s\S]*^# remote-workspace:end$/m,
      () => {
        replaced = true;
        return remoteDevSSHConfigContent;
      },
    );

    if (!replaced) {
      if (updatedSSHConfigContent.trim()) {
        updatedSSHConfigContent += '\n';
      } else {
        updatedSSHConfigContent = '';
      }

      updatedSSHConfigContent += `${remoteDevSSHConfigContent}\n`;
    }

    if (updatedSSHConfigContent !== sshConfigContent) {
      FSE.outputFileSync(filePath, updatedSSHConfigContent);
      console.info('SSH configuration updated.');
    }
  }

  private load(toIgnoreCache: boolean): string {
    let {filePath} = this.options;

    let content = this.content;

    if (toIgnoreCache || typeof content !== 'string') {
      content = FSE.existsSync(filePath)
        ? FSE.readFileSync(filePath, 'utf8')
        : '';

      this.content = content;
    }

    return content;
  }
}
