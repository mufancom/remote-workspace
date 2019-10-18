import {Avatar, List, Popconfirm, message} from 'antd';
import classNames from 'classnames';
import _ from 'lodash';
import md5 from 'md5';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, Fragment, ReactNode} from 'react';

import {
  WorkspaceMetadata,
  WorkspaceProjectWithPullMergeRequestInfo,
  WorkspaceStatus,
  WorkspaceStatusWithPullMergeRequestInfo,
} from '../../../bld/shared';

const REFRESH_INTERVAL_DEFAULT = 10000;

export interface WorkspaceListProps {
  editingWorkspace: WorkspaceMetadata | undefined;
  all: boolean;
  onEditClick(workspace: WorkspaceMetadata): void;
}

@observer
export class WorkspaceList extends Component<WorkspaceListProps> {
  private timer: number | undefined;

  @observable
  private _workspaces: WorkspaceStatusWithPullMergeRequestInfo[] = [];

  @observable
  private _activeWorkspaceId: string = '';

  private get workspaces(): WorkspaceStatusWithPullMergeRequestInfo[] {
    if (this.props.all) {
      return this._workspaces;
    }

    let owner = localStorage.email;

    return this._workspaces.filter(workspace => workspace.owner === owner);
  }

  private get activeWorkspaceId(): string {
    return this._activeWorkspaceId;
  }

  render(): ReactNode {
    return (
      <List
        dataSource={this.workspaces}
        renderItem={workspace => {
          let projects = workspace.projects;

          return (
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
                  projects.length ? (
                    _.flatMap(projects, (project, index) =>
                      this.renderProject(workspace, project, index, projects),
                    )
                  ) : (
                    <span>-</span>
                  )
                }
              ></List.Item.Meta>
            </List.Item>
          );
        }}
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
    let {editingWorkspace} = this.props;

    let editingWorkspaceId = editingWorkspace && editingWorkspace.id;

    let onTunnelClick = (): void => {
      this.switchTunnel(workspace).catch(console.error);
    };

    let onUntunnelClick = (): void => {
      this.untunnel().catch(console.error);
    };

    let onWorkspaceClick = (): void => {
      this.launch(workspace).catch(console.error);
    };

    let onLogClick = (): void => {
      this.log(workspace.id).catch(console.error);
    };

    let onEditClick = (): void => {
      let {onEditClick} = this.props;
      onEditClick(workspace);
    };

    let onDeleteConfirm = (): void => {
      this.delete(workspace.id).catch(console.error);
    };

    return _.compact([
      workspace.ready &&
        (this.activeWorkspaceId === workspace.id ? (
          <span onClick={onUntunnelClick}>untunnel</span>
        ) : (
          <a onClick={onTunnelClick}>tunnel</a>
        )),
      workspace.ready && <a onClick={onWorkspaceClick}>workspace</a>,
      <a onClick={onLogClick}>log</a>,
      workspace.id === editingWorkspaceId ? (
        <span>edit</span>
      ) : (
        <a onClick={onEditClick}>edit</a>
      ),
      <Popconfirm
        placement="bottom"
        title="Are you sure you want to delete this workspace?"
        onConfirm={onDeleteConfirm}
      >
        <a>delete</a>
      </Popconfirm>,
    ]);
  }

  private renderProject(
    workspace: WorkspaceStatusWithPullMergeRequestInfo,
    {name, git: {pullMergeRequest}}: WorkspaceProjectWithPullMergeRequestInfo,
    index: number,
    projects: WorkspaceProjectWithPullMergeRequestInfo[],
  ): ReactNode {
    return (
      <Fragment key={index}>
        {workspace.ready ? (
          <span>
            <a
              className="project-name"
              onClick={() => this.launch(workspace, name)}
            >
              {name}
            </a>
            {pullMergeRequest ? (
              <span className="pull-merge-request">
                (
                <a
                  className={pullMergeRequest.state}
                  href={pullMergeRequest.url}
                >
                  {pullMergeRequest.text}
                </a>
                )
              </span>
            ) : (
              undefined
            )}
          </span>
        ) : (
          <span className="project-name">{name}</span>
        )}
        {index < projects.length - 1 ? <span>, </span> : undefined}
      </Fragment>
    );
  }

  private async _refresh(): Promise<void> {
    let response = await fetch('/api/workspaces');

    let {data} = (await response.json()) as {
      data?: WorkspaceStatusWithPullMergeRequestInfo[];
    };

    if (data) {
      this._workspaces = data;
    }
  }

  private async switchTunnel(workspace: WorkspaceStatus): Promise<void> {
    let response = await fetch('/api/switch-tunnel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspace,
      }),
    });

    let {error} = await response.json();

    if (error) {
      message.error(error);
    } else {
      this._activeWorkspaceId = workspace.id;

      message.loading('Tunneling...');
    }
  }

  private async untunnel(): Promise<void> {
    let response = await fetch('/api/untunnel');

    let {error} = await response.json();

    if (error) {
      message.error(error);
    } else {
      this._activeWorkspaceId = '';

      message.loading('Untunneling...');
    }
  }

  private async launch(
    workspace: WorkspaceStatus,
    projectName?: string,
  ): Promise<void> {
    let response = await fetch('/api/launch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspace,
        project: projectName,
      }),
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
