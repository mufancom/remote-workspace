import {PageHeader} from 'antd';
import {observer} from 'mobx-react';
import React, {Component, ReactNode, createRef} from 'react';

import {WorkspaceForm, WorkspaceList} from './@components';

@observer
export class App extends Component {
  private workspaceListRef = createRef<WorkspaceList>();

  render(): ReactNode {
    return (
      <div>
        <PageHeader title="Workspaces" />
        <div className="section-content">
          <WorkspaceList ref={this.workspaceListRef} />
        </div>
        <PageHeader title="Create Workspace" />
        <div className="section-content">
          <WorkspaceForm onCreate={this.onWorkspaceFormCreate} />
        </div>
      </div>
    );
  }

  private onWorkspaceFormCreate = (): void => {
    this.workspaceListRef.current!.refresh();
  };
}
