import * as Path from 'path';

import 'villa/platform/node';

import {Server} from '@hapi/hapi';
import Inert from '@hapi/inert';
import {BoringCache} from 'boring-cache';
import {main} from 'main-function';

import {CreateWorkspaceOptions, NEVER} from '../../bld/shared';

import {Config, Daemon, DaemonStorageData} from './@core';

const config = new Config('remote-dev.config.json');

const storage = new BoringCache<DaemonStorageData>('.remote-dev.json');

const daemon = new Daemon(config, storage);

main(async () => {
  const apiServer = new Server({
    host: config.host,
    port: config.port,
    routes: {
      files: {
        relativeTo: Path.join(__dirname, '../../bld/client'),
      },
    },
  });

  await apiServer.register(Inert);

  apiServer.route({
    method: 'GET',
    path: '/api/templates',
    handler() {
      return {
        data: config.templates,
      };
    },
  });

  apiServer.route({
    method: 'GET',
    path: '/api/workspaces',
    handler() {
      return {
        data: daemon.workspaceStatuses,
      };
    },
  });

  apiServer.route({
    method: 'POST',
    path: '/api/workspaces',
    async handler({payload}) {
      let id = await daemon.createWorkspace(payload as CreateWorkspaceOptions);

      return {
        data: {
          id,
        },
      };
    },
  });

  apiServer.route({
    method: 'DELETE',
    path: '/api/workspaces/{id}',
    async handler({params: {id}}) {
      await daemon.deleteWorkspace(id);

      return {};
    },
  });

  apiServer.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
      },
    },
  });

  await apiServer.start();

  return NEVER;
});
