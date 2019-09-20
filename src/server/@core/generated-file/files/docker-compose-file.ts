import * as ChildProcess from 'child_process';
import * as Path from 'path';

import * as FSE from 'fs-extra';
import YAML from 'js-yaml';
import _ from 'lodash';
import * as v from 'villa';

import {GeneralDockerVolumeEntry} from '../../config';
import {Workspace} from '../../workspace';
import {AbstractGeneratedFile} from '../generated-file';

import {writeTextFileToVolume} from './@utils';

const WORKSPACES_PATH = './workspaces';

function NETWORK_NAME(workspace: Workspace): string {
  return `${workspace.id}-network`;
}

// workspace

function WORKSPACE_SOURCE_PATH(workspace: Workspace): string {
  return `../workspaces/${workspace.id}`;
}

// workspace metadata

function WORKSPACE_METADATA_SOURCE_PATH(workspace: Workspace): string {
  return `${WORKSPACE_SOURCE_PATH(workspace)}/metadata.json`;
}

// repositories

export class DockerComposeFile extends AbstractGeneratedFile {
  async update(workspaces: Workspace[]): Promise<void> {
    console.info('Updating initialize identity...');

    await writeTextFileToVolume(
      this.config.name,
      'user-ssh',
      'initialize-identity',
      this.config.identity,
      '600',
    );

    console.info('Updating workspace metadata...');

    for (let workspace of workspaces) {
      await this.outputFile(
        WORKSPACE_METADATA_SOURCE_PATH(workspace),
        JSON.stringify(workspace.raw, undefined, 2),
      );
    }

    console.info('Updating docker-compose.yml...');

    await this.outputFile(
      'docker-compose.yml',
      this.buildDockerComposeYAML(workspaces),
    );
  }

  async prune(workspaces: Workspace[]): Promise<void> {
    let workspaceIdSet = new Set(workspaces.map(workspace => workspace.id));

    let ids: string[];

    try {
      ids = await FSE.readdir(WORKSPACES_PATH);
    } catch {
      ids = [];
    }

    let outdatedIds = ids.filter(id => !workspaceIdSet.has(id));

    for (let id of outdatedIds) {
      console.info(`Removing outdated workspace "${id}"...`);
      await FSE.remove(Path.join(WORKSPACES_PATH, id));
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
                volumes: [
                  {
                    type: 'bind',
                    source: WORKSPACE_SOURCE_PATH(workspace),
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
}
