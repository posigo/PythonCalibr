import React from "react";
import { Link } from "react-router-dom";
import logo from '../assest/logo.png';
import backgroundImage from '../assest/fon_paper_white.jpg';
import { constTexts } from "../utils/constTexts";
import './Home/Home.css';

const Home = () => {
    return (
        <div className="home-container">
            <div className="home-content">
                <div className="title-container">
                    <div className="main-title">
                        {constTexts.titletask}
                    </div>
                </div>

                <div className="code-title">
                    {constTexts.codetask}
                </div>

                <img 
                    src={logo} 
                    alt="Calibration Logo" 
                    className="logo-image"
                />
                
                <p className="description-text">
                    {constTexts.description}
                </p>
                
                <Link 
                    to="/calculations" 
                    className="action-button"
                >
                    <span className="button-text">
                        {constTexts.buttonText} &rarr;
                    </span>
                    <span className="button-highlight"></span>
                </Link>
            </div>
        </div>
    )
}

export default Home;