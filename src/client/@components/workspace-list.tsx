import {List} from 'antd';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode} from 'react';

import {WorkspaceMetadata} from '../../server-client';

const REFRESH_INTERVAL_DEFAULT = 10000;

export interface WorkspaceListProps {}

@observer
export class WorkspaceList extends Component<WorkspaceListProps> {
  private timer: number | undefined;

  @observable
  private workspaces: WorkspaceMetadata[] = [];

  render(): ReactNode {
    return (
      <List
        dataSource={this.workspaces}
        renderItem={workspace => (
          <List.Item actions={this.renderActions(workspace)}>
            <List.Item.Meta
              description={workspace.displayName || workspace.id}
            ></List.Item.Meta>
          </List.Item>
        )}
      />
    );
  }

  componentDidMount(): void {
    this.refresh();

    this.timer = setInterval(() => this.refresh(), REFRESH_INTERVAL_DEFAULT);
  }

  componentWillUnmount(): void {
    clearInterval(this.timer);
  }

  private renderActions(workspace: WorkspaceMetadata): ReactNode[] {
    let onOpenClick = (): void => {};

    return [<a onClick={onOpenClick}>Open</a>];
  }

  private refresh(): void {
    this._refresh().catch(console.error);
  }

  private async _refresh(): Promise<void> {
    let response = await fetch('/api/workspaces');

    let {data} = (await response.json()) as {data?: WorkspaceMetadata[]};

    if (data) {
      this.workspaces = data;
    }
  }
}
