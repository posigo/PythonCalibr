import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const NotificationModal = ({ 
  show, 
  onHide, 
  notification, 
  markAsRead,
  onMarkAsRead 
}) => {
    
  useEffect(() => {
    // При открытии модального окна, если есть функция markAsRead и уведомление не прочитано
    if (show && markAsRead && !notification?.notification_profile?.is_read) {
      const markNotificationAsRead = async () => {
        try {
          await markAsRead(notification.id);
          // Вызываем callback после успешного пометки как прочитанного
          // if (onMarkAsRead) {
          //   onMarkAsRead(notification.id);
          // }
          onMarkAsRead?.(notification.id);
        } 
        catch (error) {
          console.error('Error marking notification as read:', error);
        }
      };      
      markNotificationAsRead();
      console.log("markAsRead->",(notification.id))   
      //markAsRead(notification.id);
      
    }
  }, [show, notification, markAsRead,onMarkAsRead]);

  if (!show || !notification) return null;

  // Определяем тип модального окна (входящее/исходящее)  
  const isSender_Null = notification.sender_name === null ? true : false;
  const isSender_Value = !!notification.sender_name;
  // console.log("notification.sender_name=", notification.sender_name)
  // console.log("isSender_Null=", isSender_Null)
  // console.log("isSender_Value=", isSender_Value)
  // let isIncoming = false;
  // if (isSender_Null === true) {
  //   if (!isSender_Value) isIncoming = true
  // }
  // else isIncoming = isSender_Value;  
  const isIncoming = (isSender_Null && !isSender_Value) ? true : isSender_Value;
  const iconClass = isIncoming ? 'bi-envelope-open' : 'bi-send';
  const title = isIncoming 
    ? `Отправитель: ${notification.sender_name}`
    : `Получатель: ${notification.recipient_name}`;

  return createPortal(
    <div 
      className="modal modal-backdrop fade show animate__animated animate__fadeIn" 
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      tabIndex='-1'
      onKeyDown={(e) => e.key === 'Escape' && onHide()}
      onClick={onHide}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-primary shadow-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header bg-primary text-white">  
            <div className="d-flex align-items-center">
              <i className={`bi ${iconClass} me-2 fs-4`}></i>
              <h5 className="modal-title">{title}</h5>
            </div>          
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onHide}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="d-flex align-items-start">              
                <i className="bi bi-chat-square-text text-primary me-3 fs-4"></i>              
              <div> 
                <p className='mb-0 fs-5 text-break'>{notification.message}</p>
                <small className='text-muted mt-2 d-block'>
                  <i className="bi bi-clock me-1"></i>
                  {new Date(notification.date_created).toLocaleString()}
                </small>
              </div>
            </div>
          </div>
          <div className="modal-footer border-top-0">
            <button 
              type="button" 
              className="btn btn-outline-primary rounded-pill px-4" 
              onClick={onHide}
            >
              <i className="bi bi-x-lg me-2"></i>              
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationModal;