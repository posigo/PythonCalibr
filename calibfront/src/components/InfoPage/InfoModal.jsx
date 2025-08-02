// components/ContactModal.jsx
import React from 'react';

const InfoModal = ({ show, onHide, contactText }) => {
  if (!show) {
    return null;
  }

  return (
    <div 
      className="modal fade show d-block" 
      tabIndex="-1" 
      role="dialog"
      onClick={onHide}
    >
      <div 
        className="modal-dialog modal-lg modal-dialog-centered" 
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content shadow">
          <div className="modal-header bg-light">
            <h5 className="modal-title fw-bold">Информация</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="p-4 bg-light rounded">
              <pre 
                className="mb-0 text-break fw-normal"
                style={{ 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '1rem',
                  fontFamily: 'monospace'
                }}
              >
                {contactText}
              </pre>
            </div>
          </div>
          <div className="modal-footer bg-light">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onHide}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;