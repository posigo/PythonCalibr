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
    if (show && markAsRead && notification && !notification.notification_profile?.is_read) {
      const markNotificationAsRead = async () => {
        try {
          await markAsRead(notification.id);
          // Вызываем callback после успешного пометки как прочитанного
          if (onMarkAsRead) {
            onMarkAsRead(notification.id);
          }
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
  const isIncoming = !!notification.sender_name;
  const title = isIncoming 
    ? `Отправитель: ${notification.sender_name}` 
    : `Получатель: ${notification.recipient_name}`;

  return createPortal(
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <p>{notification.message}</p>
          </div>
          <div className="modal-footer">
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
    </div>,
    document.body
  );
};

export default NotificationModal;