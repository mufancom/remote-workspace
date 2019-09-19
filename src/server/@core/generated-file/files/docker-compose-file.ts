import YAML from 'js-yaml';
import _ from 'lodash';

import {Config} from '../../config';
import {Workspace} from '../../workspace';
import {AbstractGeneratedFile} from '../generated-file';

function NETWORK_NAME(workspace: Workspace): string {
  return `${workspace.id}-network`;
}

// workspace

function WORKSPACE_SOURCE_PATH(workspace: Workspace): string {
  return `../workspaces/${workspace.id}`;
}

const WORKSPACE_TARGET_PATH = '/root/workspace';

// workspace metadata

function WORKSPACE_METADATA_SOURCE_PATH(workspace: Workspace): string {
  return `${WORKSPACE_SOURCE_PATH(workspace)}/metadata.json`;
}

// repositories

const REPOSITORIES_SOURCE_PATH = '../repositories';
const REPOSITORIES_TARGET_PATH = '/root/repositories';

// authorized_keys

const AUTHORIZED_KEYS_SOURCE_PATH = './authorized_keys';
const AUTHORIZED_KEYS_TARGET_PATH = '/root/.ssh/authorized_keys';

// initialize-identity

const INITIALIZE_IDENTITY_SOURCE_PATH = './initialize-identity';
const INITIALIZE_IDENTITY_TARGET_PATH = '/root/.ssh/_initialize-identity';

// ssh

const SSH_TARGET_PATH = '/etc/ssh';

export class DockerComposeFile extends AbstractGeneratedFile {
  constructor(config: Config) {
    super(config);
  }

  update(workspaces: Workspace[]): void {
    this.output('docker-compose.yml', this.buildDockerComposeYAML(workspaces));

    this.output(INITIALIZE_IDENTITY_SOURCE_PATH, this.config.identity);

    for (let workspace of workspaces) {
      this.output(
        WORKSPACE_METADATA_SOURCE_PATH(workspace),
        JSON.stringify(workspace.raw, undefined, 2),
      );
    }
  }

  private buildDockerComposeYAML(workspaces: Workspace[]): string {
    let config = this.config;

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
                  `${WORKSPACE_SOURCE_PATH(
                    workspace,
                  )}:${WORKSPACE_TARGET_PATH}`,
                  `${REPOSITORIES_SOURCE_PATH}:${REPOSITORIES_TARGET_PATH}`,
                  `${AUTHORIZED_KEYS_SOURCE_PATH}:${AUTHORIZED_KEYS_TARGET_PATH}`,
                  `${INITIALIZE_IDENTITY_SOURCE_PATH}:${INITIALIZE_IDENTITY_TARGET_PATH}`,
                  `${config.volumes.ssh}:${SSH_TARGET_PATH}`,
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
        _.values(config.volumes).map(volume => [
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

  //   private buildInitializeScript(workspace: Workspace): string {
  //     let hosts = _.uniq(
  //       workspace.projects.map(project => project.git.url.match(/@(.+?):/)![1]),
  //     );

  //     let sshKeyScansScript = hosts
  //       .map(
  //         host =>
  //           `ssh-keyscan ${ShellQuote.quote([host])} >> /root/.ssh/known_hosts`,
  //       )
  //       .join('\n');

  //     let projectsScript = workspace.projects
  //       .map(
  //         ({
  //           name,
  //           git: {url, branch = 'master', newBranch, depth},
  //           scripts: {initialize} = {},
  //         }) => `\
  // if [ ! -d ${ShellQuote.quote([name])} ]
  // then
  //   GIT_SSH_COMMAND="ssh -i ${INITIALIZE_IDENTITY_TARGET_PATH}"\\
  //     git ${ShellQuote.quote(
  //       _.compact([
  //         'clone',
  //         '--no-checkout',
  //         '--branch',
  //         branch,
  //         depth && `--depth=${depth}`,
  //         url,
  //         name,
  //       ]),
  //     )}
  //   ${
  //     newBranch
  //       ? `git ${ShellQuote.quote([`-C`, name, `checkout`, `-b`, newBranch])}`
  //       : ''
  //   }
  //   ${initialize || ''}
  // fi
  // `,
  //       )
  //       .join('\n');

  //     return `\
  // #!/bin/sh

  // echo -n "${this.config.identity}" > ${INITIALIZE_IDENTITY_TARGET_PATH}

  // chmod 600 ${INITIALIZE_IDENTITY_TARGET_PATH}

  // ${sshKeyScansScript}

  // mkdir -p ${PROJECTS_TARGET_PATH}
  // cd ${PROJECTS_TARGET_PATH}

  // ${projectsScript}
  // `;
  // }
}
