import {Checkbox, PageHeader} from 'antd';
import {CheckboxChangeEvent} from 'antd/lib/checkbox';
import {observable} from 'mobx';
import {observer} from 'mobx-react';
import React, {Component, ReactNode, createRef} from 'react';

import {WorkspaceMetadata} from '../../bld/shared';

import {WorkspaceForm, WorkspaceList} from './@components';

@observer
export class App extends Component {
  private workspaceListRef = createRef<WorkspaceList>();

  @observable
  private toShowAllWorkspaces = false;

  @observable
  private editingWorkspace: WorkspaceMetadata | undefined;

  render(): ReactNode {
    let editingWorkspace = this.editingWorkspace;

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
            editingWorkspace={editingWorkspace}
            ref={this.workspaceListRef}
            all={this.toShowAllWorkspaces}
            onEditClick={this.onWorkspaceListEditClick}
          />
        </div>
        <PageHeader
          title={editingWorkspace ? 'Edit Workspace' : 'Create Workspace'}
          extra={
            editingWorkspace && (
              <a onClick={this.onCancelEditButtonClick}>cancel</a>
            )
          }
        />
        <div className="section-content">
          <WorkspaceForm
            workspace={editingWorkspace}
            onSubmitSuccess={this.onWorkspaceFormSubmitSuccess}
          />
        </div>
      </div>
    );
  }

  private onWorkspaceListEditClick = (workspace: WorkspaceMetadata): void => {
    this.editingWorkspace = workspace;
  };

  private onCancelEditButtonClick = (): void => {
    this.editingWorkspace = undefined;
  };

  private onWorkspaceFormSubmitSuccess = (): void => {
    this.workspaceListRef.current!.refresh();
    this.editingWorkspace = undefined;
  };

  private onShowAllWorkspacesCheckboxChange = ({
    target,
  }: CheckboxChangeEvent): void => {
    this.toShowAllWorkspaces = target.checked;
  };
}
