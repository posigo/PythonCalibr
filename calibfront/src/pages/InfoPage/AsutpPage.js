// components/AsutpPage.jsx
import React, { useState, useEffect } from 'react';
import InfoPageLoader from '../../components/InfoPage/InfoPageLoader';
import { getAsutpInfo } from '../../services/api';
//import 'bootstrap/dist/css/bootstrap.min.css';

const AsutpPage = () => {
  
  return (
    <InfoPageLoader 
      onLoaded={({ asutpData }) => (
        <div className="container-fluid mt-5 mb-5 py-4">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <h1 className="text-start mb-2 text-primary">{asutpData.department}</h1>
              </div>
            </div>

            {/* Описание */}
            <div className="row mb-2">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-primary text-white">
                    <h2 className="text-start mb-0 h4">Описание</h2>
                  </div>
                  <div className="card-body">
                    {asutpData.description?.map((desc, index) => (
                      <p key={index} className="card-text mb-0 text-start">
                      {desc}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Расположение */}
            <div className="row mb-2">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-success text-white">
                    <h2 className="mb-0 h4 text-start">Расположение</h2>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      {asutpData.location?.map((loc, index) => (
                        <li key={index} className="list-group-item text-start">
                          <i className="bi bi-geo-alt me-2"></i>
                          {loc}
                        </li>
                      ))}   
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Контакты */}
            <div className="row">
              <div className="col-12">
                <div className="card shadow-sm">
                  <div className="card-header bg-info text-white">
                    <h2 className="mb-0 h4 text-start">Контакты</h2>
                  </div>
                  <div className="card-body">
                    <div className="row g-4">
                      {asutpData.contacts?.map((contact, index) => (
                        <div key={index} className="col-lg-6 col-xl-4">
                          <div className="card h-100 border-primary">
                            <div className="card-body">
                              <h5 className="card-title text-primary">{contact.position}</h5>
                              {contact.full_name && (
                                <h6 className="card-subtitle mb-3 text-muted">{contact.full_name}</h6>
                              )}
                              {contact.details?.map((detail, detailIndex) => (
                                <div key={detailIndex} className="mt-3">
                                  <small className="fw-bold text-muted">{detail.type}:</small>
                                  <div className="mt-1">
                                    {detail.value?.map((val, valIndex) => (
                                      <span 
                                        key={valIndex} 
                                        className="badge bg-secondary me-1 mb-1"
                                      >
                                        {val}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} 
    />    
  );
};

export default AsutpPage;