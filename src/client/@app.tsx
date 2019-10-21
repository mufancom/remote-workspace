import {Route} from 'boring-router-react';
import {observer} from 'mobx-react';
import React, {Component, ReactNode} from 'react';

import {route} from './@routes';
import {CreateView, HomeView} from './@views';

@observer
export class App extends Component {
  render(): ReactNode {
    return (
      <>
        <Route match={route.home} component={HomeView} />
        <Route match={route.create} component={CreateView} />
      </>
    );
  }
}
