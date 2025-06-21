import React, { useState, useEffect } from 'react';
import { 
  getNotifications, 
  updateNotification, 
  deleteNotification,
  getUsers,
  getGroups
} from '../../services/api';
import { toast } from 'react-toastify';
import AdminNotificationModal from './AdminNotificationModal';
import ConfirmationNotificationModal from './ConfirmationNotificationModal';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notifsResponse, usersResponse, groupsResponse] = await Promise.all([
          getNotifications(),
          getUsers(),
          getGroups()
        ]);
        setNotifications(notifsResponse.data);
        setUsers(usersResponse.data);
        setGroups(groupsResponse.data);
      } catch (error) {
        toast.error('Ошибка при загрузке данных');
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleSave = async (updatedNotification) => {
    try {
      await updateNotification(updatedNotification.id, updatedNotification);
      setNotifications(notifications.map(n => 
        n.id === updatedNotification.id ? updatedNotification : n
      ));
      setShowEditModal(false);
      toast.success('Уведомление успешно обновлено');
    } catch (error) {
      toast.error('Ошибка при обновлении уведомления');
      console.error('Error updating notification:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNotification(selectedNotification.id);
      setNotifications(notifications.filter(n => n.id !== selectedNotification.id));
      setShowDeleteModal(false);
      toast.success('Уведомление успешно удалено');
    } catch (error) {
      toast.error('Ошибка при удалении уведомления');
      console.error('Error deleting notification:', error);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      <div className="table-responsive">
        <table className="table table-striped table-bordered table-hover">
          <thead className="table-dark">
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Тип</th>
              <th scope="col">Отправитель</th>
              <th scope="col">Получатель</th>
              <th scope="col">Группа</th>
              <th scope="col">Дата</th>
              {/* <th scope="col">Сообщение</th>
              <th scope="col">Прочитано</th>
              <th scope="col">Активно</th>
              <th scope="col">Новое</th>
              <th scope="col">Действия</th> */}
            </tr>
          </thead>
          <tbody>
            {notifications.map(notification => (
              <tr key={notification.id}>
                <td>{notification.id}</td>
                <td>
                  {notification.notification_type === 'system' && 'Системное'}
                  {notification.notification_type === 'user' && 'Пользовательское'}
                  {notification.notification_type === 'group' && 'Групповое'}
                  {notification.notification_type === 'registration' && 'Регистрация'}
                </td>
                <td>{notification.sender || '-'}</td>
                <td>{notification.recipient || '-'}</td>
                <td>{notification.group_recipient || '-'}</td>
                <td>{new Date(notification.date_created).toLocaleString()}</td>
                {/* <td>{notification.message.substring(0, 15)}...</td>
                <td>{notification.notification_profile?.is_read ? 'Да' : 'Нет'}</td>
                <td>{notification.notification_profile?.is_active ? 'Да' : 'Нет'}</td>
                <td>{notification.notification_profile?.is_new ? 'Да' : 'Нет'}</td> */}
                <td>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className="btn btn-info btn-sm me-2"
                      onClick={() => {                        
                        setSelectedNotification(notification);
                        console.log("view_not->",selectedNotification)
                        setShowViewModal(true);
                      }}
                    >
                      <i className="bi bi-eye-fill"></i> Просмотр
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning btn-sm me-2"
                      onClick={() => {
                        setSelectedNotification(notification);
                        setShowEditModal(true);
                      }}
                    >
                      <i className="bi bi-pencil-fill"></i> Изменить
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        setSelectedNotification(notification);
                        setShowDeleteModal(true);
                      }}
                    >
                      <i className="bi bi-trash-fill"></i> Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {notifications.length === 0 && !loading && (
        <div className="alert alert-info text-center">
          Нет уведомлений для отображения
        </div>
      )}
      
      <AdminNotificationModal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        notification={selectedNotification}
        readOnly={true}
        users={users}
      />
      
      <AdminNotificationModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        notification={selectedNotification}
        users={users}
        groups={groups}
        onSave={handleSave}
      />
      
      <ConfirmationNotificationModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Подтвердите действия -- удаление"
        message={`Вы уверены?!, что хотите удалить уведомление #${selectedNotification?.id}. Отменить будет невозможно! `}
      />
    </div>
  );
};

export default AdminNotifications;