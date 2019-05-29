import {Server, Socket, createServer} from 'net';

import getPort from 'get-port';

export type ConnectionPrepareSocketHandler<TMetadata> = (
  metadata: TMetadata,
) => Promise<Socket>;

export class ConnectionManager<TMetadata> {
  constructor(
    private prepareSocketHandler: ConnectionPrepareSocketHandler<TMetadata>,
  ) {}

  async open(metadata: TMetadata): Promise<Server> {
    let prepareSocketHandler = this.prepareSocketHandler;

    let handleConnection = async (socket: Socket): Promise<void> => {
      let targetSocket = await prepareSocketHandler(metadata);

      socket.pipe(targetSocket);
      targetSocket.pipe(socket);
    };

    let server = createServer(socket => {
      handleConnection(socket).catch(console.error);
    });

    let port = await getPort();

    server.listen(port);

    return server;
  }
}
