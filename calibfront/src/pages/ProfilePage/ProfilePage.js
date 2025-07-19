import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    getCurrentUser,
    updateCurrentUser,
    deleteCurrentUser,
    logoutUser
} from '../../services/api'
import { toast } from 'react-toastify';

const ProfilePage = () => {
  // Получаем методы аутентификации из контекста
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  
  // Состояния для данных пользователя
  const [userData, setUserData] = useState({
    username: '',
    first_name: '',
    email: '',
    groups: []
  });
  
  // Состояния для формы редактирования
  const [editData, setEditData] = useState({
    username: '',
    first_name: '',
    email: '',    
    new_password: '',
    confirm_password: '' 
  });
  
  // Состояния для UI
  const [loading, setLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Загрузка данных пользователя при монтировании компонента
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("profile_fetch")
        const data = await getCurrentUser();
        setUserData(data.data);
        console.log("data=", data);
        console.log("userData=", userData);
        // Инициализируем форму текущими значениями
        setEditData({
          username: data.username,
          first_name: data.first_name || '',
          email: data.email || '',          
          new_password: '',
          confirm_password: '' 
        });
      } catch (error) {
        toast.error('Ошибка загрузки данных профиля');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Обработчик изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик отправки формы обновления
  const handleUpdate = async () => {
    try {
      setLoading(true);
      
      // Подготавливаем данные для отправки
      const updateData = {};
      if (editData.confirm_password || editData.new_password) {
        if (editData.new_password !== editData.confirm_password) {
          setShowUpdateModal(false);
          toast.error('Новый пароль и подтверждение не совпадают');
          return;
        }
        // updateData.current_password = editData.current_password;
        updateData.password = editData.new_password;
      }
      if (editData.username !== userData.username) updateData.username = editData.username;
      if (editData.first_name !== userData.first_name) updateData.first_name = editData.first_name;
      if (editData.email !== userData.email) updateData.email = editData.email;
      
      //console.log("updateData=", updateData)
      // Отправляем запрос на обновление
      const updatedUser = await updateCurrentUser(updateData);
      //console.log("updatedUser=", updatedUser)
      // Обновляем состояние
      //setUserData(updatedUser);
      setUserData({
        ...updatedUser.data,
        groups: Array.isArray(updatedUser.data.groups) ? updatedUser.data.groups : []
      });
      //console.log("userData=", userData)
      setEditData({
        username: '',
        first_name: '',
        email: '',        
        new_password: '',
        confirm_password: '' 
      });
      setShowUpdateModal(false);
      toast.success('Профиль успешно обновлен');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка обновления профиля');
    } finally {      
      setLoading(false);
    }
  };

  // Обработчик удаления аккаунта
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      console.log("delete in");
      // Удаляем пользователя
      const result = await deleteCurrentUser();
      console.log("delete=",result);
      
      // Выходим из системы
      const refreshToken = localStorage.getItem('refresh_token');
      console.log("refreshToken=", refreshToken)
      const accessToken = localStorage.getItem('access_token');
      console.log("accessToken=", accessToken)
      // const res_logout = await logoutUser(refreshToken);
      // console.log("res_logout=", res_logout)
      // Очищаем хранилище и контекст
      localStorage.removeItem('access_token');
      console.log("removeItem access_token")
      localStorage.removeItem('refresh_token');
      console.log("removeItem refresh_token")
      setAuth(false);
      
      // Перенаправляем на главную
      navigate('/');
      toast.success('Ваш аккаунт был успешно удален');
    } catch (error) {
      console.log("error delete me=",error)
      toast.error(error.response?.data?.detail || 'Ошибка удаления аккаунта');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !userData.username) {
    return <div className="text-center my-5">Загрузка профиля...</div>;
  }

  return (
    <div className="container mt-5 pt-3 mb-5 pb-3">
      <h2>Профиль пользователя</h2>
      
      <div className="row">
        {/* Отображение текущих данных */}
        <div className="col-md-12">
          <div className="card mb-4">
            <div className="card-header">
              <h5>Текущие данные</h5>
            </div>
            <div className="card-body">
              <form >
                <div className="mb-3">
                  <label 
                    htmlFor='username'
                    className='form-label'
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className="bi bi-person-fill me-2"></i>
                    Имя пользователя (login)
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={userData.username} 
                    readOnly 
                    disabled
                  />
                  <div className='input-group'>
                    <span className='input-group-text'>
                      <i className='bi bi-person'></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control border border-2 border-primary" 
                      id="username" 
                      name="username"
                      value={editData.username}
                      onChange={handleInputChange}
                      placeholder="Оставьте пустым, чтобы не менять"
                    />
                  </div>                  
                </div>
                <div className="mb-3">
                  <label 
                    htmlFor="first_name" 
                    className="form-label" 
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className="bi bi-person-badge-fill me-2"></i>
                    Имя
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={userData.first_name || 'Не указано'} 
                    readOnly 
                    disabled
                  />
                  <div className='input-group'>
                    <span className='input-group-text'>
                      <i className='bi bi-person-badge'></i>
                    </span>
                    <input 
                      type="text" 
                      className="form-control border border-2 border-primary" 
                      id="first_name" 
                      name="first_name"
                      value={editData.first_name}
                      onChange={handleInputChange}
                      placeholder="Оставьте пустым, чтобы не менять"
                  />
                  </div>                  
                </div>
                <div className="mb-3">
                  <label 
                  htmlFor='email'
                  className='form-label'
                  style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    {/* <i className="bi bi-mailbox me-2"></i> */}
                    <i className="bi bi-envelope-at-fill me-2"></i>
                    Email
                  </label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={userData.email || 'Не указан'} 
                    readOnly
                    disabled 
                  />
                  <div className='input-group'>
                    <span className='input-group-text'>
                      {/* <i className='bi bi-mailbox'></i> */}
                      {/* <i className="bi bi-envelope-at"></i>                       */}
                      <i className="bi bi-envelope"></i>
                    </span>
                    <input 
                      type="email" 
                      className="form-control border border-2 border-primary" 
                      id="email" 
                      name="email"
                      value={editData.email}
                      onChange={handleInputChange}
                      placeholder="Оставьте пустым, чтобы не менять"
                    />
                  </div>                  
                </div>
                <div className='mb-3'>
                  <label 
                    htmlFor='password'
                    className='form-label'
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className='bi bi-key me-2'></i>
                    Новый пароль (для смены пароля)
                  </label>
                  <div className='input-group'>
                    <span className='input-group-text'>
                      <i className='bi  bi-lock'></i>
                    </span>
                    <input 
                      type="password" 
                      className="form-control border border-2 border-primary" 
                      id="new_password" 
                      name="new_password"
                      value={editData.new_password}
                      onChange={handleInputChange}
                      placeholder="Введите новый пароль"
                    />
                  </div>
                  <label 
                    htmlFor='confirm_password'
                    className='form-label'
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className='bi bi-key-fill me-2'></i>
                    Повторите пароль
                  </label>
                  <div className='input-group'>
                    <span className='input-group-text'>
                      {/* <i className='bi bi-lock-fill'></i> */}
                      <i className='bi bi-lock-fill'></i>
                    </span>
                    <input 
                      type="password" 
                      className="form-control border border-2 border-primary" 
                      id="confirm_password" 
                      name="confirm_password"
                      value={editData.confirm_password}
                      onChange={handleInputChange}
                      placeholder="Повторите"
                    />
                  </div>                  
                </div>
                <div className="mb-3">
                  <label 
                    className="form-label"
                    style={{ textAlign: 'left', display: 'block', marginLeft: 10 }}
                  >
                    <i className="bi bi-people-fill me-2"></i>
                    Группы
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={userData.groups?.join(', ') || 'Нет групп'} 
                    readOnly
                    disabled
                  />
                </div>

                <div className="d-flex justify-content-between">
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setShowUpdateModal(true)}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-repeat me-2"></i>
                    Обновить профиль
                  </button>
                  
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={loading}
                  >
                    {/* <i className="bi bi-eraser me-2"></i> */}
                    <i className="bi bi-trash me-2"></i>
                    Удалить аккаунт
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Форма редактирования
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Редактирование профиля</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Новое имя пользователя</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="username" 
                    name="username"
                    value={editData.username}
                    onChange={handleInputChange}
                    placeholder="Оставьте пустым, чтобы не менять"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="first_name" className="form-label">Новое имя</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="first_name" 
                    name="first_name"
                    value={editData.first_name}
                    onChange={handleInputChange}
                    placeholder="Оставьте пустым, чтобы не менять"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Новый email</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    id="email" 
                    name="email"
                    value={editData.email}
                    onChange={handleInputChange}
                    placeholder="Оставьте пустым, чтобы не менять"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="current_password" className="form-label">Текущий пароль (для смены пароля)</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    id="current_password" 
                    name="current_password"
                    value={editData.current_password}
                    onChange={handleInputChange}
                    placeholder="Введите текущий пароль"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="new_password" className="form-label">Новый пароль</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    id="new_password" 
                    name="new_password"
                    value={editData.new_password}
                    onChange={handleInputChange}
                    placeholder="Введите новый пароль"
                  />
                </div>
                
                <div className="d-flex justify-content-between">
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => setShowUpdateModal(true)}
                    disabled={loading}
                  >
                    Обновить профиль
                  </button>
                  
                  <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={loading}
                  >
                    Удалить аккаунт
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div> */}
      </div>
      
      {/* Модальное окно подтверждения обновления */}
      {showUpdateModal && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} 
          tabIndex='-1' 
          onKeyDown={(e) => e.key === 'Escape' && setShowUpdateModal(false)}
          autoFocus
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-arrow-repeat me-2"></i>Подтверждение обновления</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowUpdateModal(false)}
                  disabled={loading}
                ></button>
              </div>
              <div className="modal-body">
                <p>Вы уверены, что хотите обновить данные профиля?</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowUpdateModal(false)}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleUpdate}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : null}
                  <i className="bi bi-arrow-repeat me-2"></i>
                  Подтвердить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          tabIndex='-1'
          onKeyDown={(e) => e.key === 'Escape' && setShowDeleteModal(false)}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  {/* <i className="bi bi-eraser me-2"></i> */}
                  <i className="bi bi-trash me-2"></i>
                  Подтверждение удаления</h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                ></button>
              </div>
              <div className="modal-body">
                <p>Вы уверены, что хотите удалить свой аккаунт? Это действие нельзя отменить!</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loading}
                >
                  Отмена
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : null}
                  {/* <i className="bi bi-eraser me-2"></i> */}
                  <i className="bi bi-trash me-2"></i>
                  Удалить аккаунт
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
