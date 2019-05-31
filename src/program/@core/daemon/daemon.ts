import {Config} from '../config';
import {AuthorizedKeysFile, DockerComposeFile} from '../generated-file';
import {WorkspaceManager} from '../workspace';

export class Daemon {
  readonly authorizedKeysFile = new AuthorizedKeysFile(this.config);

  readonly dockerComposeFile = new DockerComposeFile(
    this.config,
    this.workspaceManager,
  );

  constructor(
    private config: Config,
    private workspaceManager: WorkspaceManager,
  ) {
    config.update();
  }
}
