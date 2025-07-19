import React, { useState, useEffect } from 'react';
import {useAuth} from '../../context/AuthContext'
import { 
  getUsers, 
  getVerifiedUsers, 
  getUnverifiedUsers,
  assignGroup,
  changeGroup,
  getGroups,
  getNotifications,
  createNotification,
  getActionHistory
} from '../../services/api';
import { toast } from 'react-toastify';

const AdminPanel = () => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [unverifiedUsers, setUnverifiedUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth) {
      fetchData();
    }
  }, [auth, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          const usersResponse = await getUsers();
          setUsers(usersResponse.data);
          break;
        case 'verified':
          const verifiedResponse = await getVerifiedUsers();
          setVerifiedUsers(verifiedResponse.data);
          break;
        case 'unverified':
          const unverifiedResponse = await getUnverifiedUsers();
          setUnverifiedUsers(unverifiedResponse.data);
          break;
        case 'groups':
          const groupsResponse = await getGroups();
          setGroups(groupsResponse.data);
          break;
        case 'notifications':
          const notificationsResponse = await getNotifications();
          setNotifications(notificationsResponse.data);
          break;
        case 'history':
          const historyResponse = await getActionHistory();
          setActionHistory(historyResponse.data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      if (error.response && error.response.status === 403) {
        toast.error('У вас нет прав для просмотра этого раздела');
      } else {
        toast.error('Ошибка загрузки данных');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignGroup = async (userId, groupName) => {
    try {
      await assignGroup(userId, groupName);
      toast.success('Группа успешно назначена');
      fetchData();
    } catch (error) {
      console.error('Ошибка назначения группы:', error);
      toast.error(error.response?.data?.detail || 'Ошибка назначения группы');
    }
  };

  const handleChangeGroup = async (userId, newGroupName) => {
    try {
      await changeGroup(userId, newGroupName);
      toast.success('Группа успешно изменена');
      fetchData();
    } catch (error) {
      console.error('Ошибка изменения группы:', error);
      toast.error(error.response?.data?.detail || 'Ошибка изменения группы');
    }
  };

  const renderTabContent = () => {
    if (loading) return <div className="text-center my-5">Загрузка...</div>;

    switch (activeTab) {
      case 'users':
        return (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя пользователя</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Группы</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.first_name}</td>
                    <td>{user.email}</td>
                    <td>{user.groups?.map(g => g.name).join(', ')}</td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => handleChangeGroup(user.id, 'admins')}
                      >
                        Сделать админом
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'verified':
        return (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя пользователя</th>
                  <th>Группы</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {verifiedUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.groups?.join(', ')}</td>
                    <td>
                      <select 
                        className="form-select form-select-sm"
                        onChange={(e) => handleChangeGroup(user.id, e.target.value)}
                      >
                        <option value="">Изменить группу</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.name}>{group.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'unverified':
        return (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя пользователя</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {unverifiedUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>
                      <select 
                        className="form-select form-select-sm"
                        onChange={(e) => handleAssignGroup(user.id, e.target.value)}
                      >
                        <option value="">Назначить группу</option>
                        <option value="users">users</option>
                        <option value="extusers">extusers</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'groups':
        return (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Количество пользователей</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <tr key={group.id}>
                    <td>{group.id}</td>
                    <td>{group.name}</td>
                    <td>{group.user_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'notifications':
        return (
          <div>
            <button className="btn btn-primary mb-3">Создать уведомление</button>
            <div className="list-group">
              {notifications.map(notification => (
                <div key={notification.id} className="list-group-item">
                  <h5>{notification.message}</h5>
                  <small className="text-muted">
                    От: {notification.sender?.username || 'Система'} | 
                    Дата: {new Date(notification.date_created).toLocaleString()}
                  </small>
                </div>
              ))}
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Пользователь</th>
                  <th>Действие</th>
                  <th>Дата</th>
                  <th>Описание</th>
                </tr>
              </thead>
              <tbody>
                {actionHistory.map(history => (
                  <tr key={history.id}>
                    <td>{history.id}</td>
                    <td>{history.user?.username || 'Система'}</td>
                    <td>{history.action_type}</td>
                    <td>{new Date(history.action_date).toLocaleString()}</td>
                    <td>{history.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return <div>Выберите раздел</div>;
    }
  };

  return (
    <div className="container mt-4">
      <h2>Личный кабинет</h2>
      
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Все пользователи
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'verified' ? 'active' : ''}`}
            onClick={() => setActiveTab('verified')}
          >
            Подтвержденные
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'unverified' ? 'active' : ''}`}
            onClick={() => setActiveTab('unverified')}
          >
            Неподтвержденные
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            Группы
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Уведомления
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            История действий
          </button>
        </li>
      </ul>
      
      {renderTabContent()}
    </div>
  );
};

export default AdminPanel;
