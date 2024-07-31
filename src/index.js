import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import {VenomProvider} from "./providers/VenomConnect";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <VenomProvider>
      <App />
    </VenomProvider>
  </React.StrictMode>
);
