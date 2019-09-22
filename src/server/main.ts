#!/usr/bin/env node

import * as Path from 'path';

import 'villa/platform/node';

import {Server} from '@hapi/hapi';
import Inert from '@hapi/inert';
import {BoringCache} from 'boring-cache';
import {main} from 'main-function';

import {CreateWorkspaceOptions, NEVER} from '../../bld/shared';

import {Config, Daemon, DaemonStorageData} from './@core';

const config = new Config('remote-workspace.config.json');

const storage = new BoringCache<DaemonStorageData>('.remote-workspace.json');

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
    path: '/workspaces/{id}/log',
    async handler({params: {id}}, toolkit) {
      try {
        let log = await daemon.retrieveWorkspaceLog(id);

        let refreshHTML =
          log.length > 10000
            ? '<div>Log too long, auto refresh disabled.</div>'
            : '<meta http-equiv="refresh" content="10" />';

        return `${refreshHTML}<pre>${log
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>`;
      } catch {
        return toolkit.response('Page not found').code(404);
      }
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
    async handler() {
      return {
        data: await daemon.getWorkspaceStatuses(),
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

  console.info(`Listening on "${config.host}:${config.port}"...`);

  return NEVER;
});
