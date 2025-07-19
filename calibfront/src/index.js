import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import Mn_right from './Mn_right'
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* <BrowserRouter base="/site">
      <App />
    </BrowserRouter> */}
    <App />
  </React.StrictMode>
);

//const mn_right = ReactDOM.createRoot(document.getElementById('mn_right'));
//mn_right.render(
//      <Mn_right />
//);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
