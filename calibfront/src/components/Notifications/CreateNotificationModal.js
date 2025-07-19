import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getVerifiedUsers, createNotification } from '../../services/api';
import { toast } from 'react-toastify';

const CreateNotificationModal = ({ show, onClose, onNotificationCreated }) => {
  // Состояние для списка пользователей
  const [users, setUsers] = useState([]);
  // Состояние для формы
  const [formData, setFormData] = useState({
    recipient: 0,
    notificationType: 'user',
    message: ''
  });
  // Состояние загрузки
  const [isLoading, setIsLoading] = useState(false);

  // Загружаем список пользователей при открытии модального окна
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getVerifiedUsers();
        setUsers(response.data);
      } catch (error) {
        toast.error('Ошибка при загрузке пользователей');
        console.error('Error fetching users:', error);
      }
    };

    if (show) {
      fetchUsers();
      // Сброс формы при открытии
      setFormData({
        recipient: '',
        notificationType: 'user',
        message: ''
      });
    }
  }, [show]);

  // Обработчик изменения полей формы
    const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    console.log("formData=", formData)
    try {
      // Создаем уведомление
      const response = await createNotification({
        recipient: (+formData.recipient),
        notification_type: formData.notificationType,
        message: formData.message      
      });
      console.log("response_create_Notif=", response)
      toast.success('Уведомление успешно создано');
      onClose(); // Закрываем модальное окно после успешного создания
      // Вызываем колбэк после успешного создания
      if (typeof onNotificationCreated === 'function') {
        onNotificationCreated();
      }
    } catch (error) {
      toast.error('Ошибка при создании уведомления');
      console.error('Error creating notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return createPortal(
    <div 
      className='modal modal-backdrop fade show animate__animated animate__fadeIn' 
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      tabIndex='-1'
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onClick={e => e.stopPropagation()}
    >    
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border border-primary shadow-lg">
          {/* Заголовок модального окна */}
          <div className="modal-header bg-primary text-white">
            <i className="bi bi-file-earmark-plus me-2"></i>
            {/* <i className="bi bi-plus-circle me-2"></i> */}
            {/* <i className="bi bi-chat-square-text me-2"></i> */}
            <h5 className="modal-title">Создание уведомления</h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          
          {/* Тело модального окна с формой */}
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Поле выбора пользователя */}
              <div className="mb-3">
                <label htmlFor="recipientSelect" className="form-label">Получатель</label>
                <div className='input-group'>
                  <span className='input-group-text text-primary'> 
                      <i className="bi bi-person me-2"></i>
                  </span>
                  <select
                    id="recipientSelect"
                    className="form-select"
                    name="recipient"
                    value={formData.recipientId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Выберите получателя</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id} name="recipientId" onChange={handleChange}>
                          {user.username}
                        </option>
                      ))}
                  </select>
                </div>                
              </div>
              
              {/* Поле выбора типа уведомления */}
              <div className="mb-3">
                <label htmlFor="typeSelect" className="form-label">Тип уведомления</label>
                <div className='input-group'>
                  <span className='input-group-text text-primary'>
                    <i class="bi bi-people"></i>
                  </span>
                  <select
                    id="typeSelect"
                    className="form-select"
                    name="notificationType"
                    value={formData.notificationType}
                    onChange={handleChange}
                    required
                  >
                    <option value="system">Системное</option>
                    <option value="user">Пользовательское</option>
                    <option value="group">Групповое</option>
                    <option value="registration">Регистрация</option>
                  </select>  
                </div>                
              </div>
              
              {/* Поле ввода сообщения */}
              <div className="mb-3">
                <label htmlFor="messageInput" className="form-label">                       
                    Сообщение
                </label>
                <div className='input-group'>
                  <span className='input-group-text text-primary align-top'>
                    <i className="bi bi-chat-square-text me-2 align-top"></i>
                  </span>
                  <textarea
                    id="messageInput"
                    className="form-control"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={4}
                    required
                  />
                </div>                
              </div>
            </div>
            
            {/* Футер модального окна с кнопками */}
            <div className="modal-footer border-top-0">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={isLoading}
              >
                Закрыть
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading}
              >
                <i class="bi bi-send me-2"></i>
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Отправка...
                  </>
                ) : 'Отправить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateNotificationModal;