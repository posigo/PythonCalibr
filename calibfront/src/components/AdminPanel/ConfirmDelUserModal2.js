import React from 'react';

const ConfirmDelUserModal2 = ({
    show,
    onHide,
    onConfirm,
    title = 'Подтвердите действия', 
  message = 'Вы уверены?! что хотите выполнить это действие. Отменить его будет невозможно.' 
}) => {
  if (!show) return null;

  return (
    <div
      className='modal modal-backdrop fade show d-block animate__animated animate__faster animate__fadeIn' 
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.8)' }}
      tabIndex='-1'
      onKeyDown={(e) => e.key === 'Escape' && onHide()}
      onClick={(e) => e.target === e.currentTarget && onHide()}
    >
      <div className='modal-dialog modal-dialog-centered nimate__animated animate__faster animate__zoomIn'>
        <div className='modal-content border border-3 border-danger shadow-lg'>
          <div className='modal-header bg-danger text-white'>
            <h5 className='modal-title fw-bold'>
              <i class='bi bi-person-dash-fill me-2'></i>            
              {title}
            </h5>
            <button 
              type='button' 
              className='btn-close btn-close-white' 
              onClick={onHide}
              aria-label='Close'
            ></button>
          </div>
          <div className='modal-body py-4 animate__animated animate__headShake'>
            <i className='bi bi-exclamation-circle-fill text-danger fs-3 text-danger animate__animated animate__pulse animate__infinite'></i>
            <p className='mb-0 fs-5 fw-semibold'>{message}</p>
          </div>
          <div className='modal-footer border-top-0'>
            <button 
              type='button' 
              className='btn btn-outline-secondary fw-bold me-3 animate__animated animate__fadeInLeft' 
              onClick={onHide}
              style={{ minWidth: '120px' }}
            >
              <i className='bi bi-x-circle me-2'></i>
              Отмена
            </button>
            <button 
              type='button' 
              className='btn btn-danger fw-bold px-4 animate__animated animate__pulse animate__infinite'              
              onClick={onConfirm}
              autoFocus
            >
              <i className='bi bi-check-circle-fill me-2'></i>
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDelUserModal2;