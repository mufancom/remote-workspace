import {PageHeader} from 'antd';
import {observer} from 'mobx-react';
import React, {Component, ReactNode} from 'react';

import {CreateWorkspaceForm, WorkspaceList} from './@components';

@observer
export class App extends Component {
  render(): ReactNode {
    return (
      <div>
        <PageHeader title="Workspaces" />
        <div className="section-content">
          <WorkspaceList />
        </div>
        <PageHeader title="Create Workspace" />
        <div className="section-content">
          <CreateWorkspaceForm />
        </div>
      </div>
    );
  }
}
