import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Link, useParams } from 'react-router-dom';
//import logo from './logo.svg';
//import './App.css';
//import Home from './pages/Home';
//import CalculationList from './components/CalculationList';
//import CalculationDetail from './components/CalculationDetail';

function Mn_right() {
  return (
    <div className="">
        <Link to="/" className="btn btn-secondary">Back to List</Link>
        <Link to="/" className="btn btn-primary ml-2">Edit</Link>
        <button className="btn btn-danger ml-2">Delete</button>

    </div>
  );
}

export default Mn_right;
