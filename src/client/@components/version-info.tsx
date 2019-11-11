import {Alert} from 'antd';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode} from 'react';

export interface VersionInfoProps {
  className?: string;
}

@observer
export class VersionInfo extends Component<VersionInfoProps> {
  @observable
  private clientHostVersion: string | undefined;

  @observable
  private serverVersion: string | undefined;

  render(): ReactNode {
    let clientHostVersion = this.clientHostVersion;
    let serverVersion = this.serverVersion;

    let versionMismatch =
      !!serverVersion && clientHostVersion !== serverVersion;

    return (
      <div>
        {versionMismatch && (
          <Alert
            type="warning"
            showIcon
            message={`The version of your client host (${clientHostVersion ||
              'unknown'}) does not match the server (${serverVersion}).`}
          ></Alert>
        )}
      </div>
    );
  }

  componentDidMount(): void {
    this.checkVersion().catch(console.error);
  }

  private async checkVersion(): Promise<void> {
    let clientHostResponse = await fetch('/api/client-host-version');

    if (clientHostResponse.status === 200) {
      let {data: clientHostVersion} = (await clientHostResponse.json()) as {
        data?: string;
      };

      this.clientHostVersion = clientHostVersion;
    }

    let serverResponse = await fetch('/api/server-version');

    let {data: serverVersion} = (await serverResponse.json()) as {
      data?: string;
    };

    this.serverVersion = serverVersion;
  }
}
