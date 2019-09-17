import * as Path from 'path';

import 'villa/platform/node';

import {Server} from '@hapi/hapi';
import Inert from '@hapi/inert';
import {BoringCache} from 'boring-cache';
import {main} from 'main-function';

import {CreateWorkspaceOptions} from '../../bld/shared';

import {Config, Daemon, DaemonStorageData} from './@core';
import {NEVER} from './@utils';

const {PORT = '8022', HOST = 'localhost'} = process.env;

const config = new Config('remote-dev.config.json');

const storage = new BoringCache<DaemonStorageData>('.remote-dev.json');

const daemon = new Daemon(config, storage);

main(async () => {
  const apiServer = new Server({
    port: PORT,
    host: HOST,
    routes: {
      files: {
        relativeTo: Path.join(__dirname, '../../bld/client'),
      },
    },
  });

  await apiServer.register(Inert);

  apiServer.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
      },
    },
  });

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
        data: storage.list('workspaces'),
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

  await apiServer.start();

  return NEVER;
});
