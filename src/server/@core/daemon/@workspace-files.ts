import * as ChildProcess from 'child_process';
import * as Path from 'path';

import * as FSE from 'fs-extra';
import YAML from 'js-yaml';
import _ from 'lodash';
import * as v from 'villa';

import {writeTextFileToVolume} from '../../@utils';
import {Config, GeneralDockerVolumeEntry} from '../config';
import {Workspace} from '../workspace';

function NETWORK_NAME(workspace: Workspace): string {
  return `${workspace.id}-network`;
}

// workspace

function WORKSPACE_SOURCE_PATH(config: Config, workspace: Workspace): string {
  return Path.join(config.dir, 'workspaces', workspace.id);
}

// workspace metadata

function WORKSPACE_METADATA_SOURCE_PATH(
  config: Config,
  workspace: Workspace,
): string {
  return Path.join(WORKSPACE_SOURCE_PATH(config, workspace), 'metadata.json');
}

// repositories

export class WorkspaceFiles {
  constructor(readonly config: Config) {}

  async update(workspaces: Workspace[]): Promise<void> {
    let config = this.config;

    console.info('Updating authorized keys...');

    await writeTextFileToVolume(
      config.name,
      'user-ssh',
      'authorized_keys',
      await this.buildAuthorizedKeys(),
    );

    console.info('Updating initialize identity...');

    await writeTextFileToVolume(
      config.name,
      'user-ssh',
      'initialize-identity',
      config.identity,
      '600',
    );

    console.info('Updating workspace metadata...');

    for (let workspace of workspaces) {
      await FSE.outputFile(
        WORKSPACE_METADATA_SOURCE_PATH(config, workspace),
        JSON.stringify(workspace.raw, undefined, 2),
      );
    }

    console.info('Updating docker-compose.yml...');

    await FSE.outputFile(
      Path.join(config.dir, 'docker-compose.yml'),
      this.buildDockerComposeYAML(workspaces),
    );
  }

  async prune(workspaces: Workspace[]): Promise<void> {
    let workspacesPath = Path.join(this.config.dir, 'workspaces');

    let workspaceIdSet = new Set(workspaces.map(workspace => workspace.id));

    let ids: string[];

    try {
      ids = await FSE.readdir(workspacesPath);
    } catch {
      ids = [];
    }

    let outdatedIds = ids.filter(id => !workspaceIdSet.has(id));

    for (let id of outdatedIds) {
      console.info(`Removing outdated workspace "${id}"...`);
      await FSE.remove(Path.join(workspacesPath, id));
    }

    console.info('Pruning docker containers...');

    await v.awaitable(
      ChildProcess.spawn('docker', ['container', 'prune', '--force']),
    );

    console.info('Pruning docker networks...');

    await v.awaitable(
      ChildProcess.spawn('docker', ['network', 'prune', '--force']),
    );
  }

  private buildDockerComposeYAML(workspaces: Workspace[]): string {
    let config = this.config;

    let sharedVolumes: GeneralDockerVolumeEntry[] = [
      {
        type: 'volume',
        source: 'repositories',
        target: '/root/repositories',
      },
      {
        type: 'volume',
        source: 'vscode-extensions',
        target: '/root/.vscode-server/extensions',
      },
      {
        type: 'volume',
        source: 'vscode-machine-data',
        target: '/root/.vscode-server/data/Machine',
      },
      {
        type: 'volume',
        source: 'user-ssh',
        target: '/root/.ssh',
      },
      {
        type: 'volume',
        source: 'ssh',
        target: '/etc/ssh',
      },
      ...config.sharedVolumes,
    ];

    let document = {
      version: '3.2',
      services: _.fromPairs(
        _.flatMap(workspaces, workspace => {
          return [
            [
              workspace.id,
              {
                image: workspace.image,
                labels: {
                  // Recreate workspace container on workspace options change.
                  'remote-workspace.hash': workspace.hash,
                },
                restart: 'always',
                volumes: [
                  {
                    type: 'bind',
                    source: WORKSPACE_SOURCE_PATH(config, workspace),
                    target: '/root/workspace',
                  },
                  ...sharedVolumes,
                ],
                networks: [NETWORK_NAME(workspace)],
                ports: [`${workspace.port}:22`],
              },
            ],
            ...workspace.services.map(({name, ...service}) => [
              `${workspace.id}_${name}`,
              {
                ...service,
                restart: 'always',
                networks: {
                  [NETWORK_NAME(workspace)]: {
                    aliases: [name],
                  },
                },
              },
            ]),
          ];
        }),
      ),
      volumes: _.fromPairs(
        sharedVolumes
          .filter(volume => volume.type === 'volume')
          // tslint:disable-next-line: no-null-keyword
          .map(({source}) => [source, null]),
      ),
      networks: _.fromPairs(
        workspaces.map(workspace => [
          NETWORK_NAME(workspace),
          // tslint:disable-next-line: no-null-keyword
          null,
        ]),
      ),
    };

    return [
      '# Generated file, changes directly made to this file will be overridden.',
      YAML.dump(document),
    ].join('\n');
  }

  private async buildAuthorizedKeys(): Promise<string> {
    let config = this.config;

    let lines = await v.map(
      config.users,
      async ({name, email, publicKey, publicKeyFile}) => {
        if (publicKeyFile) {
          publicKey = await FSE.readFile(
            Path.join(config.dir, publicKeyFile),
            'utf8',
          );
        }

        if (!publicKey) {
          throw new Error(`Missing public key for user "${name}".`);
        }

        let line = [
          [
            `environment="REMOTE_USER_NAME=${name}"`,
            `environment="GIT_AUTHOR_NAME=${name}"`,
            `environment="GIT_AUTHOR_EMAIL=${email}"`,
            `environment="GIT_COMMITTER_NAME=${name}"`,
            `environment="GIT_COMMITTER_EMAIL=${email}"`,
          ].join(','),
          publicKey.trim(),
        ].join(' ');

        return `${line}\n`;
      },
    );

    return [
      '# Generated file, changes directly made to this file will be overridden.',
      lines.join(''),
    ].join('\n');
  }
}
