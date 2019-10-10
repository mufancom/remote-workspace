import * as Path from 'path';
import {URL} from 'url';

import * as FSE from 'fs-extra';
import _ from 'lodash';

import {WorkspaceMetadata} from '../../../bld/shared';

import {SSH_CONFIG_HOST} from './ssh-config';

export class VSCodeStorage {
  private path: string | undefined;

  constructor() {
    switch (process.platform) {
      case 'win32': {
        let appDataPath = process.env.APPDATA;
        this.path = appDataPath && Path.join(appDataPath, 'Code/storage.json');
        break;
      }
      case 'darwin': {
        let homePath = process.env.HOME;
        this.path =
          homePath &&
          Path.join(homePath, 'Library/Application Support/Code/storage.json');
        break;
      }
      case 'linux': {
        let homePath = process.env.HOME;
        this.path =
          homePath && Path.join(homePath, '.config/Code/storage.json');
        break;
      }
      default:
        break;
    }

    if (!this.path) {
      console.error('Unable to determine VSCode storage.json path.');
    }
  }

  cleanUp(activeWorkspaces: WorkspaceMetadata[]): void {
    let path = this.path;

    if (!path || !FSE.existsSync(path)) {
      return;
    }

    let hostSet = new Set(
      activeWorkspaces.map(workspace => SSH_CONFIG_HOST(workspace)),
    );

    let storageJSON = FSE.readFileSync(path, 'utf8');

    let storage = JSON.parse(storageJSON);

    let updatedStorage = _.cloneDeep(storage);

    let {
      openedPathsList: {workspaces3, files2, workspaceLabels, fileLabels},
    } = updatedStorage;

    if (workspaces3) {
      for (let [index, entry] of workspaces3.entries()) {
        if (isOutDatedRemoteWorkspacePath(entry)) {
          workspaces3.splice(index, 1);

          if (workspaceLabels) {
            workspaceLabels.splice(index, 1);
          }
        }
      }
    }

    if (files2) {
      for (let [index, entry] of files2.entries()) {
        if (isOutDatedRemoteWorkspacePath(entry)) {
          files2.splice(index, 1);

          if (fileLabels) {
            fileLabels.splice(index, 1);
          }
        }
      }
    }

    if (!_.isEqual(updatedStorage, storage)) {
      FSE.writeFileSync(path, JSON.stringify(updatedStorage, undefined, 4));
      console.info('Cleaned up VSCode recently opened.');
    }

    function isOutDatedRemoteWorkspacePath(path: unknown): boolean {
      if (typeof path !== 'string') {
        return false;
      }

      let url = new URL(path);

      if (url.protocol !== 'vscode-remote:') {
        return false;
      }

      let [type, host] = decodeURIComponent(url.hostname).split('+');

      if (type !== 'ssh-remote') {
        return false;
      }

      if (!host.startsWith('remote-workspace-')) {
        return false;
      }

      return !hostSet.has(host);
    }
  }
}
