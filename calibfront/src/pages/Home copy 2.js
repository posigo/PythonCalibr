import React from "react";
import { Link } from "react-router-dom";
import logo from '../assest/logo.png';
import { constTexts } from "../utils/constTexts";

const Home = () => {
    return (
        <div className="container-fluid">
            <div className="text-center my-5">
                <h1 className="py-2">{constTexts.titletask}</h1>
                <h1>{constTexts.codetask}</h1>
                <img src={logo} alt="Calibration Logo" className="img-fluid my-4" style={{ maxHeight: '300px' }} />
                <p className="lead">
                    {constTexts.description}
                </p>
                <Link to="/calculations" className="btn btn-primary btn-lg">
                    {constTexts.buttonText}
                </Link>
            </div>
        </div>
    )
}

export default Home