import React, { useState, useEffect, useCallback } from 'react';
import {useAuth} from '../../context/AuthContext'
import { 
  getUsers, 
  getUser,
  createUser,
  updateUser,
  deleteUser,
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
import { constTexts } from '../../utils/constTexts';
import { jwtDecode } from 'jwt-decode';

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
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Состояния для модальных окон
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    first_name: '',
    email: '',
    group_id: '',
    is_verified: false
  });
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    first_name: '',
    email: '',
    group_id: ''
  });
  
  const fetchAdmins = useCallback( async () => {
    const token = localStorage.getItem('access_token');  
    // Декодируем токен, если userData пустой
    const decodedToken = token ? jwtDecode(token) : null;
    console.log("token=", token);
    console.log("decodedToken=", decodedToken);
    console.log("is_superuser_dec=", decodedToken?.is_superuser);
    console.log("is_group_dec=", decodedToken.groups);
    console.log("is_group_dec=", decodedToken.groups?.some(g => g.name === 'admins'));
    if (decodedToken) {
      setIsSuperUser(decodedToken.is_superuser || false);
      setIsAdmin(decodedToken.groups?.some(group => group === 'admins') || false);      
    }    
    console.log("token=", token);
    console.log("decodedToken=", decodedToken);
    console.log("is_superuser=", decodedToken?.is_superuser);
    console.log("isAdmin=", isAdmin);
  }, [])
    
  console.log("is_superuser=", isSuperUser);
    console.log("isAdmin=", isAdmin);

  useEffect(() => {
    if (auth) {
      fetchAdmins();
      fetchData();
      fetchGroups();
    }
  }, [auth, activeTab, fetchAdmins]);
 
  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          if (isSuperUser || isAdmin) {
            const usersResponse = await getUsers();
            setUsers(usersResponse.data);
            console.log("ddd=",usersResponse.data);
            console.log("sssddd=",users);
          }
          break;
        case 'verified':
          const verifiedResponse = await getVerifiedUsers();
          setVerifiedUsers(verifiedResponse.data);
          console.log("sss=", verifiedUsers);
          break;
        case 'unverified':
          if (isSuperUser || isAdmin) {
            const unverifiedResponse = await getUnverifiedUsers();
            setUnverifiedUsers(unverifiedResponse.data);
          }
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
          if (isSuperUser || isAdmin) {
            const historyResponse = await getActionHistory();
            setActionHistory(historyResponse.data);
          }
          break;
        default:
          break;
      }
    } catch (error) {
      handleApiError(error);
      // console.error('Ошибка загрузки данных:', error);
      // if (error.response && error.response.status === 403) {
      //   toast.error('У вас нет прав для просмотра этого раздела');
      // } else {
      //   toast.error('Ошибка загрузки данных');
      // }
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await getGroups();
      setGroups(response.data);
    } catch (error) {
      handleApiError(error);
    }
  };

  const fetchUser = async (userId) => {
    try {
      const response = await getUser(userId);
      setCurrentUser(response.data);
      setFormData({
        username: response.data.username,
        password: '',
        first_name: response.data.first_name || '',
        email: response.data.email || '',
        group_id: response.data.groups?.[0]?.id || '',
        is_verified: response.data.profile.is_verified || false,
        registration_date: response.data.registration_date || null,
        verification_date: response.data.verification_date || null
      });
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleApiError = (error) => {
    console.error('Ошибка:', error);
    if (error.response?.status === 401) {
      toast.error('У вас нет необходимых разрешений');
    } else if (error.response?.status === 403) {
      toast.error('У вас нет прав для этого действия');
    } else {
      toast.error('Произошла ошибка');
    }
  };

  const handleEditClick = async (userId) => {
    await fetchUser(userId);
    setShowEditModal(true);
  };

  const handleDeleteClick = (userId) => {
    setCurrentUser(users.find(u => u.id === userId));
    setShowDeleteModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNewUserInputChange = (e) => {
    const { name, value } = e.target;
    setNewUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateUser = async () => {
    try {
      const dataToSend = {
        username: formData.username,
        first_name: formData.first_name,
        email: formData.email,
        group_id: formData.group_id,
        is_verified: formData.is_verified
      };
      
      // Добавляем пароль только если он был изменен
      if (formData.password) {
        dataToSend.password = formData.password;
      }

      await updateUser(currentUser.id, dataToSend);
      toast.success('Пользователь успешно обновлен');
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleDeleteUser = async () => {
    try {
      await deleteUser(currentUser.id);
      toast.success('Пользователь успешно удален');
      setShowDeleteModal(false);
      fetchData();
    } catch (error) {
      handleApiError(error);
    }
  };

  const handleAddUser = async () => {
    try {
      await createUser(newUserData);
      toast.success('Пользователь успешно добавлен');
      setShowAddModal(false);
      setNewUserData({
        username: '',
        password: '',
        first_name: '',
        email: '',
        group_id: ''
      });
      fetchData();
    } catch (error) {
      handleApiError(error);
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
        if (isSuperUser || isAdmin) {
          return (
            <div>
              <button 
                className="btn btn-primary mb-3 w-100"
                onClick={() => setShowAddModal(true)}
              >
                Добавить пользователя
              </button>
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Имя пользователя</th>
                      <th>Имя</th>
                      <th>Email</th>
                      <th>Группы</th>
                      <th>Подтвержден</th>
                      <th>Дата рег</th>
                      <th>Дата подт</th>
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
                        <td>{user.profile.is_verified ? 'Да' : 'Нет'}</td>
                        <td>{user.profile.registration_date}</td>
                        <td>{user.profile.verification_date}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-warning me-2"
                            onClick={() => handleEditClick(user.id)}
                          >
                            Изменить
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteClick(user.id)}
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );}
        else {break}
      case 'verified':
        return (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя пользователя</th>
                  <th>Группы</th>
                  {(isSuperUser || isAdmin) ? (<th>Изм группы</th>) : (<></>)}
                </tr>
              </thead>
              <tbody>
                {verifiedUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>{user.groups?.join(', ')}</td>
                    {(isSuperUser || isAdmin) ? ( <td>
                      <select 
                        className="form-select form-select-sm"
                        onChange={(e) => handleChangeGroup(user.id, e.target.value)}
                      >
                        <option value="">Изменить группу</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.name}>{group.name}</option>
                        ))}
                      </select>
                    </td>) : (<></>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'unverified':
        if (isSuperUser || isAdmin) {  
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
          );}
        else {break};
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
        if (isSuperUser || isAdmin) {  
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
          );}
        else {break}
      default:
        return <div>Выберите раздел</div>;
    }
  };

  return (
    <div className="container-fluid mt-4">
      <h2>{constTexts.nav.cabnt.main}</h2>
      
      <ul className="nav nav-tabs mb-4">
        { (isSuperUser || isAdmin) && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Все пользователи
            </button>
          </li>
        )}
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'verified' ? 'active' : ''}`}
            onClick={() => setActiveTab('verified')}
          >
            Подтвержденные
          </button>
        </li>
        { (isSuperUser || isAdmin) && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'unverified' ? 'active' : ''}`}
              onClick={() => setActiveTab('unverified')}
            >
              Неподтвержденные
            </button>
          </li>
        )}  
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
        { (isSuperUser || isAdmin) && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              История действий
            </button>
          </li>
        )}
      </ul>
      
      {renderTabContent()}

      {/* Модальное окно редактирования пользователя */}
      {showEditModal && currentUser && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Редактирование пользователя</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Имя пользователя</label>
                  <input
                    type="text"
                    className="form-control"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Пароль (оставьте пустым, чтобы не менять)</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Имя</label>
                  <input
                    type="text"
                    className="form-control"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Группа</label>
                  <select
                    className="form-select"
                    name="group_id"
                    value={formData.group_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    name="is_verified"
                    checked={formData.is_verified}
                    onChange={handleInputChange}
                    id="isVerifiedCheck"
                  />
                  <label className="form-check-label" htmlFor="isVerifiedCheck">
                    Подтвержден
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowEditModal(false)}
                >
                  Отмена
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleUpdateUser}
                >
                  Обновить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно удаления пользователя */}
      {showDeleteModal && currentUser && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Подтверждение удаления</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Вы уверены, что хотите удалить пользователя {currentUser.username}?</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  Отмена
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDeleteUser}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления пользователя */}
      {showAddModal && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Добавление нового пользователя</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Имя пользователя*</label>
                  <input
                    type="text"
                    className="form-control"
                    name="username"
                    value={newUserData.username}
                    onChange={handleNewUserInputChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Пароль*</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={newUserData.password}
                    onChange={handleNewUserInputChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Имя*</label>
                  <input
                    type="text"
                    className="form-control"
                    name="first_name"
                    value={newUserData.first_name}
                    onChange={handleNewUserInputChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={newUserData.email}
                    onChange={handleNewUserInputChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Группа*</label>
                  <select
                    className="form-select"
                    name="group_id"
                    value={newUserData.group_id}
                    onChange={handleNewUserInputChange}
                    required
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                >
                  Отмена
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleAddUser}
                  disabled={!newUserData.username || !newUserData.password || !newUserData.first_name || !newUserData.group_id}
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPanel;
