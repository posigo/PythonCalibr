import React, { useState, useEffect } from 'react';
import { getNotificationBySender } from '../../services/api';
import { toast } from 'react-toastify';
import NotificationModal from './NotificationModal';

const IncomingNotifications = ({ refreshKey }) => {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  
  // Загружаем входящие уведомления
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        // Получаем уведомления для текущего пользователя (получателя)
        //const response = await getNotifications();
        const response = await getNotificationBySender();
        setNotifications(response.data);        
      } catch (error) {
        toast.error('Ошибка при загрузке уведомлений');
        console.error('Error fetching notifications:', error);
      }
      finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();    
  }, [refreshKey]);

  // Обработчик открытия уведомления
  const handleOpenNotification = async (notification) => {
    try {
      // Если уведомление не прочитано, помечаем его как прочитанное
      // if (!notification.notification_profile.is_read) {
        // await getNotificationIdMark(notification.id);
        // await markAsRead(notification.id);
        // Обновляем локальное состояние
        // setNotifications(notifications.map(n => 
        //   n.id === notification.id 
        //     ? { ...n, notification_profile: { ...n.notification_profile, is_read: true } } 
        //     : n
        // ));
      // }
      
      setSelectedNotification(notification);
      setShowModal(true);
    } catch (error) {
      toast.error('Ошибка при открытии уведомления');
      console.error('Error opening notification:', error);
    }
  };

  if (loading) return <div className="text-center my-4">Загрузка уведомлений...</div>;

  return (    
    <div className="table-responsive">
      <table className="table table-striped table-bordered table-hover">
        <thead className="table-dark">
          <tr>
            <th scope="col">Дата</th>
            <th scope="col">Получатель</th>
            <th scope="col">Сообщение</th>
            <th scope="col">Действия</th>
          </tr>
        </thead>
        <tbody>
          {console.log("notifications->",notifications)}
          {notifications.map(notification => (
            <tr key={notification.id}>
              <td>{new Date(notification.date_created).toLocaleString()}</td>
              <td>{notification.recipient_name}</td>
              <td>{notification.message.substring(0, 15)}...</td>
              <td>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenNotification(notification)}
                >
                  <i className="bi bi-envelope-open me-1"></i> Прочитать
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <NotificationModal
        show={showModal}
        onHide={() => setShowModal(false)}
        notification={selectedNotification}
      />
    </div>    
  );
};

export default IncomingNotifications;