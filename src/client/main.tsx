import 'antd/dist/antd.css';

import React from 'react';
import ReactDOM from 'react-dom';

import './style.css';

import {App} from './@app';

if (!localStorage.email) {
  let email: string | undefined;

  while (!email) {
    email = prompt('Please enter your email address:') || undefined;

    if (email) {
      email = email.trim();
    }
  }

  localStorage.email = email;
}

ReactDOM.render(<App />, document.getElementById('app'));
