import {Server, Socket, createServer} from 'net';

import getPort from 'get-port';

export interface ConnectionOpenResult {
  server: Server;
  port: number;
}

export type ConnectionPrepareSocketHandler<TMetadata> = (
  metadata: TMetadata,
) => Promise<Socket>;

export class ConnectionManager<TMetadata> {
  constructor(
    private prepareSocketHandler: ConnectionPrepareSocketHandler<TMetadata>,
  ) {}

  async open(metadata: TMetadata): Promise<ConnectionOpenResult> {
    let port = 2222 || (await getPort());

    let prepareSocketHandler = this.prepareSocketHandler;

    let handleConnection = async (socket: Socket): Promise<void> => {
      console.info(`Incoming connection from port ${port}, preparing...`);

      let targetSocket = await prepareSocketHandler(metadata);

      console.info('Target socket prepared.');

      socket.on('error', error => {
        console.info('Socket error', error.message);

        targetSocket.destroy();
        console.info('Target socket destroyed.');
      });

      targetSocket.on('error', error => {
        console.info('Target socket error', error.message);

        socket.destroy();
        console.info('Socket destroyed.');
      });

      socket.pipe(targetSocket);
      targetSocket.pipe(socket);
    };

    let server = createServer(socket => {
      handleConnection(socket).catch(console.error);
    });

    server.listen(port);

    return {
      server,
      port,
    };
  }
}
