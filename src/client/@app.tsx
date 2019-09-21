import {Checkbox, PageHeader} from 'antd';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode, createRef} from 'react';

import {WorkspaceForm, WorkspaceList} from './@components';

@observer
export class App extends Component {
  private workspaceListRef = createRef<WorkspaceList>();

  @observable
  private toShowAllWorkspaces = false;

  render(): ReactNode {
    return (
      <div>
        <PageHeader
          title="Workspaces"
          extra={
            <>
              <Checkbox
                checked={this.toShowAllWorkspaces}
                onChange={this.onShowAllWorkspacesCheckboxChange}
              >
                show workspaces of other owners
              </Checkbox>
            </>
          }
        />
        <div className="section-content">
          <WorkspaceList
            ref={this.workspaceListRef}
            all={this.toShowAllWorkspaces}
          />
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

  private onShowAllWorkspacesCheckboxChange = ({
    target,
  }: CheckboxChangeEvent): void => {
    this.toShowAllWorkspaces = target.checked;
  };
}
