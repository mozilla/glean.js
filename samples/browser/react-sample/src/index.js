import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

import Glean from '@mozilla/glean/web';

const APP_NAME = 'glean-react-sample';

Glean.setLogPings(true);
Glean.setDebugViewTag(APP_NAME);

Glean.initialize(APP_NAME, true);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
