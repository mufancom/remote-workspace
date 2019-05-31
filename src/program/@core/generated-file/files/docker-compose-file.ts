import YAML from 'js-yaml';
import _ from 'lodash';

import {Config} from '../../config';
import {WorkspaceManager} from '../../workspace';
import {AbstractGeneratedFile} from '../generated-file';

export class DockerComposeFile extends AbstractGeneratedFile {
  constructor(config: Config, private workspaceManager: WorkspaceManager) {
    super('docker-compose.yml', config);

    workspaceManager.on('update', () => this.update());
  }

  get generatedContent(): string {
    let volumesConfig = this.config.volumes;

    let document = {
      version: '3',
      services: _.fromPairs(
        _.flatMap(this.workspaceManager.workspaces, workspace => {
          return [
            [
              workspace.id,
              {
                image: workspace.image,
                volumes: [
                  './authorized_keys:/root/.ssh/authorized_keys',
                  `${volumesConfig.ssh}:/etc/ssh`,
                ],
                ports: ['2222:22'],
              },
            ],
            ...workspace.services.map(({name, ...service}) => [
              `${workspace.id}_${name}`,
              service,
            ]),
          ];
        }),
      ),
      volumes: _.fromPairs(
        _.values(volumesConfig).map(volume => [
          volume,
          {
            external: true,
          },
        ]),
      ),
    };

    return [
      '# Generated file, changes directly made to this file will be override.',
      YAML.dump(document),
    ].join('\n');
  }
}
