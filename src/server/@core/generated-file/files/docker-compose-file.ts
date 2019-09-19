import YAML from 'js-yaml';
import _ from 'lodash';

import {GeneralDockerVolumeEntry} from '../../config';
import {Workspace} from '../../workspace';
import {AbstractGeneratedFile} from '../generated-file';

import {writeTextFileToVolume} from './@utils';

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
  update(workspaces: Workspace[]): void {
    writeTextFileToVolume(
      'user-ssh',
      'initialize-identity',
      this.config.identity,
      '600',
    );

    for (let workspace of workspaces) {
      this.output(
        WORKSPACE_METADATA_SOURCE_PATH(workspace),
        JSON.stringify(workspace.raw, undefined, 2),
      );
    }

    this.output('docker-compose.yml', this.buildDockerComposeYAML(workspaces));
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
