import {List, Popconfirm, message} from 'antd';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode} from 'react';

import {WorkspaceMetadata} from '../../../bld/shared';

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

  refresh(): void {
    this._refresh().catch(console.error);
  }

  private renderActions(workspace: WorkspaceMetadata): ReactNode[] {
    let onLaunchClick = (): void => {
      this.launch(workspace.id).catch(console.error);
    };

    let onDeleteConfirm = (): void => {
      this.delete(workspace.id).catch(console.error);
    };

    return [
      <a onClick={onLaunchClick}>Launch</a>,
      <Popconfirm
        placement="bottom"
        title="Are you sure you want to delete this workspace?"
        onConfirm={onDeleteConfirm}
      >
        <a>Delete</a>
      </Popconfirm>,
    ];
  }

  private async _refresh(): Promise<void> {
    let response = await fetch('/api/workspaces');

    let {data} = (await response.json()) as {data?: WorkspaceMetadata[]};

    if (data) {
      this.workspaces = data;
    }
  }

  private async launch(id: string): Promise<void> {
    let response = await fetch('/api/launch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id,
        workspaces: this.workspaces,
      }),
    });

    let {error} = await response.json();

    if (error) {
      message.error(error);
    } else {
      message.loading('Launching VS Code...');
    }
  }

  private async delete(id: string): Promise<void> {
    let response = await fetch(`/api/workspaces/${id}`, {
      method: 'DELETE',
    });

    let {error} = await response.json();

    if (error) {
      message.error(error);
    } else {
      message.success('Workspace deleted.');

      this.refresh();
    }
  }
}
