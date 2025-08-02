import React from 'react';
///////////////////////////
// value in type
// info -- primary
// warning -- warning
// critical -- danger
//////////////////////////
const ConfirmationModal = ({ 
  show, 
  onHide, 
  onConfirm, 
  type = 'info',
  title = 'Подтвердите действия', 
  message = 'Вы уверены?! что хотите выполнить это действие. Отменить его будет невозможно.' 
}) => {
  if (!show) return null;

  const colorBorder = type === 'info' ? 'border-primary' : (type === 'warning' ? 'border-warning' : 'border-danger');
  const colorBgText = type === 'info' ? 'bg-primary text-white' : (type === 'warning' ? 'bg-warning text-black' : 'bg-danger text-white');
  const colorText = type === 'info' ? 'text-primary' : (type === 'warning' ? 'text-warning' : 'text-danger');
  const colorBtn = type === 'info' ? 'btn-primary' : (type === 'warning' ? 'btn-warning' : 'btn-danger');

  return (
    <div 
      className="modal modal-backdrop fade show d-block animate__animated animate__faster animate__fadeIn" 
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}
      tabIndex='-1'
      onKeyDown={(e) => e.key === 'Escape' && onHide()}
      onClick={(e) => e.target === e.currentTarget && onHide()}
      // onKeyDown={(e) => e.key === 'Escape' && onHide()}
      // onClick={e => e.stopPropagation()}
    >
      <div className="modal-dialog modal-dialog-centered nimate__animated animate__faster animate__zoomIn">
        <div className={`modal-content border border-3 ${colorBorder} shadow-lg`}>
          <div className={`modal-header ${colorBgText}`}>
            <h5 className="modal-title fw-bold">
              {/* <i class="bi bi-envelope-dash me-2"></i>               */}
              {title}
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onHide}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body py-4 animate__animated animate__headShake">
            {/* <i className="bi bi-exclamation-triangle-fill fs-3 text-danger animate__animated animate__pulse animate__infinite"></i> */}
            {/* <i className={`bi bi-exclamation-circle-fill ${colorText} fs-3 text-danger animate__animated animate__pulse animate__infinite`}></i> */}
            <p className="mb-0 fs-5 fw-semibold">{message}</p>
          </div>
          <div className="modal-footer border-top-0">
            <button 
              type="button" 
              className="btn btn-outline-secondary fw-bold me-3 animate__animated animate__fadeInLeft" 
              onClick={onHide}
              style={{ minWidth: '120px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Отмена
            </button>
            {type !== 'info' ? (
              <button 
                type="button" 
                className={`btn ${colorBtn} fw-bold px-4 animate__animated animate__pulse animate__infinite`}
                // className="btn btn-danger" 
                onClick={onConfirm}
                autoFocus
              >
                {/* <i className="bi bi-trash me-2"></i> */}
                <i className="bi bi-check-circle-fill me-2"></i>
                Подтвердить
              </button>
            ) : (
              <>
              </>
            )}            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;