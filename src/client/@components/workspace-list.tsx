import {Avatar, List, Popconfirm, message} from 'antd';
import classNames from 'classnames';
import _ from 'lodash';
import md5 from 'md5';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode} from 'react';

import {WorkspaceStatus} from '../../../bld/shared';

const REFRESH_INTERVAL_DEFAULT = 10000;

export interface WorkspaceListProps {
  all: boolean;
}

@observer
export class WorkspaceList extends Component<WorkspaceListProps> {
  private timer: number | undefined;

  @observable
  private _workspaces: WorkspaceStatus[] = [];

  private get workspaces(): WorkspaceStatus[] {
    if (this.props.all) {
      return this._workspaces;
    }

    let owner = localStorage.email;

    return this._workspaces.filter(workspace => workspace.owner === owner);
  }

  render(): ReactNode {
    return (
      <List
        dataSource={this.workspaces}
        renderItem={workspace => (
          <List.Item actions={this.renderActions(workspace)}>
            <List.Item.Meta
              className={classNames('workspace-list-item-meta', {
                ready: workspace.ready,
              })}
              avatar={
                <Avatar
                  src={`https://www.gravatar.com/avatar/${md5(
                    workspace.owner || '',
                  )}?size=64`}
                />
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
      this._workspaces = data;
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
