import * as Path from 'path';

import * as FS from 'fs-extra';
import YAML from 'js-yaml';
import _ from 'lodash';

import {Config} from '../../config';
import {Workspace} from '../../workspace';
import {AbstractGeneratedFile} from '../generated-file';

function NETWORK_NAME(workspace: Workspace): string {
  return `${workspace.id}-network`;
}

function WORKSPACE_SOURCE_PATH(workspace: Workspace): string {
  return `../workspaces/${workspace.id}`;
}

function INITIALIZE_SCRIPT_SOURCE_PATH(workspace: Workspace): string {
  return `${WORKSPACE_SOURCE_PATH(workspace)}/initialize.sh`;
}

const INITIALIZE_IDENTITY_TARGET_PATH = '/root/.ssh/initialize-identity';

const PROJECTS_TARGET_PATH = '/root/workspace/projects';

export class DockerComposeFile extends AbstractGeneratedFile {
  constructor(config: Config) {
    super(config);
  }

  update(workspaces: Workspace[]): void {
    this.output('docker-compose.yml', this.buildDockerComposeYAML(workspaces));

    for (let workspace of workspaces) {
      this.output(
        INITIALIZE_SCRIPT_SOURCE_PATH(workspace),
        this.buildInitializeScript(workspace),
        {mode: 0o700},
      );

      FS.outputFileSync(
        Path.join(this.dir, INITIALIZE_SCRIPT_SOURCE_PATH(workspace)),
        this.buildInitializeScript(workspace),
        {mode: 0o700},
      );
    }
  }

  private buildDockerComposeYAML(workspaces: Workspace[]): string {
    let volumesConfig = this.config.volumes;

    let document = {
      version: '3',
      services: _.fromPairs(
        _.flatMap(workspaces, workspace => {
          return [
            [
              workspace.id,
              {
                image: workspace.image,
                volumes: [
                  './user-ssh:/root/.ssh',
                  `${volumesConfig.ssh}:/etc/ssh`,
                  `${WORKSPACE_SOURCE_PATH(workspace)}:/root/workspace`,
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
        _.values(volumesConfig).map(volume => [
          volume,
          {
            external: true,
          },
        ]),
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

  private buildInitializeScript(workspace: Workspace): string {
    let hosts = _.uniq(
      workspace.projects.map(
        project => project.repository.match(/@(.+?):/)![1],
      ),
    );

    let sshKeyScansScript = hosts
      .map(host => `ssh-keyscan ${host} >> /root/.ssh/known_hosts`)
      .join('\n');

    let projectsScript = workspace.projects
      .map(
        project => `\
if [ ! -d "${project.name}" ]
then
  GIT_SSH_COMMAND="ssh -i ${INITIALIZE_IDENTITY_TARGET_PATH}" git clone "${
          project.repository
        }" "${project.name}"
fi
`,
      )
      .join('\n');

    return `\
#!/bin/sh

echo -n "${this.config.identity}" > ${INITIALIZE_IDENTITY_TARGET_PATH}

chmod 600 ${INITIALIZE_IDENTITY_TARGET_PATH}

${sshKeyScansScript}

mkdir -p ${PROJECTS_TARGET_PATH}
cd ${PROJECTS_TARGET_PATH}

${projectsScript}
`;
  }
}
