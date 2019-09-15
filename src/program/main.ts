import {Config, Daemon, WorkspaceManager} from './@core';

const config = new Config('.remote-dev.json');

const workspaceManager = new WorkspaceManager();

const daemon = new Daemon(config, workspaceManager);

daemon;

// import * as Path from 'path';

// import 'villa/platform/node';

// import {Server} from '@hapi/hapi';
// import {BoringCache} from 'boring-cache';
// import {main} from 'main-function';
// import {OmitValueOfKey} from 'tslang';
// import {ConnectionManager} from './@connection-manager';
// import {Workspace, WorkspaceEntry} from './@workspace';
// import {WorkspaceContainer} from './@workspace-container';
// import {connect} from 'net';

// const {PORT = '8080', HOST = 'localhost', HOME = '.'} = process.env;

// const NEVER = new Promise<never>(() => {});

// const WORKSPACES_DB_PATH = Path.join(HOME, '.remote-workspaces.json');

// const workspaceDB = new BoringCache(WORKSPACES_DB_PATH);

// main(async () => {
//   let connectionManager = new ConnectionManager<Workspace>(async workspace => {
//     let container = new WorkspaceContainer(workspace, {
//       port: 22,
//       env: {},
//     });

//     let port = await container.start();

//     return connect(port);
//   });

//   let workspace = new Workspace({
//     id: 'test-workspace',
//     projects: [],
//   });

//   await workspace.setup();

//   let {server, port} = await connectionManager.open(workspace);

//   console.log('port', port);

//   let apiServer = new Server({
//     port: PORT,
//     host: HOST,
//   });

//   apiServer.route({
//     method: 'GET',
//     path: '/',
//     handler() {
//       return 'Up and running...';
//     },
//   });

//   apiServer.route({
//     method: 'GET',
//     path: '/workspaces',
//     handler() {
//       return {
//         data: workspaceDB.list<WorkspaceEntry>('workspaces'),
//       };
//     },
//   });

//   apiServer.route({
//     method: 'PUT',
//     path: '/workspaces/{id}',
//     handler({params: {id}, payload}) {
//       workspaceDB.pull<WorkspaceEntry>('workspaces', entry => entry.id === id);

//       workspaceDB.push<WorkspaceEntry>('workspaces', {
//         id,
//         ...(payload as OmitValueOfKey<WorkspaceEntry, 'id'>),
//       });

//       return {};
//     },
//   });

//   apiServer.route({
//     method: 'DELETE',
//     path: '/workspaces/{id}',
//     handler({params: {id}}) {
//       workspaceDB.pull<WorkspaceEntry>('workspaces', entry => entry.id === id);

//       return {};
//     },
//   });

//   await apiServer.start();

//   return NEVER;
// });
