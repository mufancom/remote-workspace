import {Avatar, List, Popconfirm, message} from 'antd';
import _ from 'lodash';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode} from 'react';

import {WorkspaceStatus} from '../../../bld/shared';

const REFRESH_INTERVAL_DEFAULT = 10000;

export interface WorkspaceListProps {}

@observer
export class WorkspaceList extends Component<WorkspaceListProps> {
  private timer: number | undefined;

  @observable
  private workspaces: WorkspaceStatus[] = [];

  render(): ReactNode {
    return (
      <List
        dataSource={this.workspaces}
        renderItem={workspace => (
          <List.Item actions={this.renderActions(workspace)}>
            <List.Item.Meta
              avatar={
                workspace.ready ? (
                  <Avatar icon="check" style={{backgroundColor: '#52c41a'}} />
                ) : (
                  <Avatar
                    icon="ellipsis"
                    style={{backgroundColor: '#1890ff'}}
                  />
                )
              }
              title={workspace.displayName || workspace.id}
              description={
                workspace.projects.map(project => project.name).join(', ') ||
                '-'
              }
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

  private renderActions(workspace: WorkspaceStatus): ReactNode[] {
    let onLaunchClick = (): void => {
      this.launch(workspace).catch(console.error);
    };

    let onLogClick = (): void => {
      this.log(workspace.id).catch(console.error);
    };

    let onDeleteConfirm = (): void => {
      this.delete(workspace.id).catch(console.error);
    };

    return _.compact([
      workspace.ready && <a onClick={onLaunchClick}>Launch</a>,
      <a onClick={onLogClick}>Log</a>,
      <Popconfirm
        placement="bottom"
        title="Are you sure you want to delete this workspace?"
        onConfirm={onDeleteConfirm}
      >
        <a>Delete</a>
      </Popconfirm>,
    ]);
  }

  private async _refresh(): Promise<void> {
    let response = await fetch('/api/workspaces');

    let {data} = (await response.json()) as {data?: WorkspaceStatus[]};

    if (data) {
      this.workspaces = data;
    }
  }

  private async launch(workspace: WorkspaceStatus): Promise<void> {
    let response = await fetch('/api/launch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workspace),
    });

    let {error} = await response.json();

    if (error) {
      message.error(error);
    } else {
      message.loading('Launching VS Code...');
    }
  }

  private async log(id: string): Promise<void> {
    window.open(`/workspaces/${id}/log`);
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
