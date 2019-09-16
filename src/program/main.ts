import * as Path from 'path';

import 'villa/platform/node';

import {Server} from '@hapi/hapi';
import Vision from '@hapi/vision';
import {BoringCache} from 'boring-cache';
import Handlebars from 'handlebars';
import {main} from 'main-function';

import {
  Config,
  CreateWorkspaceOptions,
  Daemon,
  DaemonStorageData,
} from './@core';
import {NEVER} from './@utils';

const {PORT = '8022', HOST = 'localhost'} = process.env;

const config = new Config('remote-dev.config.json');

const storage = new BoringCache<DaemonStorageData>('.remote-dev.json');

const daemon = new Daemon(config, storage);

let apiServer = new Server({
  port: PORT,
  host: HOST,
});

apiServer.route({
  method: 'GET',
  path: '/',
  handler(_request, toolkit) {
    return toolkit.view('index.html', {
      workspaces: storage.list('workspaces'),
    });
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

main(async () => {
  await apiServer.register(Vision);

  apiServer.views({
    engines: {
      html: Handlebars,
    },
    relativeTo: Path.join(__dirname, '../../static'),
    isCached: false,
  });

  await apiServer.start();

  return NEVER;
});
