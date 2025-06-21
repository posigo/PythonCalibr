import React, { useState, useEffect } from 'react';

const AdminNotificationModal = ({ 
  show, 
  onHide, 
  notification, 
  users = [], 
  groups = [], 
  onSave, 
  readOnly 
}) => {
  const [formData, setFormData] = useState({
    notification_type: 'user',
    sender: null,
    recipient: null,
    group_recipient: null,
    message: '',
    is_read: false,
    is_active: true,
    is_new: false
  });
  
  useEffect(() => {
    if (notification) {
      setFormData({
        notification_type: notification.notification_type || 'user',
        sender: notification.sender || null,
        recipient: notification.recipient || null,
        group_recipient: notification.group_recipient || null,
        message: notification.message || '',
        is_read: notification.notification_profile?.is_read || false,
        is_active: notification.notification_profile?.is_active || true,
        is_new: notification.notification_profile?.is_new || false
      });
    }
  }, [notification]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    const updatedNotification = {
      ...notification,
      ...formData,
      notification_profile: {
        is_read: formData.is_read,
        is_active: formData.is_active,
        is_new: formData.is_new
      }
    };
    onSave(updatedNotification);
  };

  if (!show) return null;
  console.log("adminModal_not", formData);
  console.log("adminModal_not_users", users);
  return (
    <div 
      className="modal modal-backdrop fade show d-block animate__animated animate__faster animate__fadeIn" 
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      tabIndex='-1'
      onKeyDown={(e) => e.key === 'Escape' && onHide()}
      onClick={(e) => e.target === e.currentTarget && onHide()}
    >
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable animate__animated animate__faster animate__zoomIn">
        <div className={`modal-content border border-3 ${readOnly ? `border-primary` : `border-warning`} shadow-lg`}>
          <div className={`modal-header ${readOnly ? `bg-primary text-white` : `bg-warning text-black`}`}>
            <h5 className="modal-title fw-bold">              
              <i className={`${readOnly ? `bi bi-eye` : `bi bi-pencil`} me-1`}></i>
              <i className="bi bi-chat-square-text me-2"></i>
              {readOnly ? 'Просмотр уведомления' : 'Редактирование уведомления'}
            </h5>
            <button 
              type="button" 
              className={`btn-close ${readOnly ? `btn-close-white` : ``}`}
              onClick={onHide}
              aria-label="Close"
            ></button>
          </div>
          
          <div className="modal-body py-4 overflow-auto h-75">
            <form>
              <div className="mb-3">
                <label className="form-label text-start d-block w-100">Тип уведомления</label>
                <div className='input-group'>
                  <span className='input-group-text text-primary'><i class="bi bi-people"></i></span>
                  {!readOnly ? (
                    <select
                      className="form-select"
                      name="notification_type"
                      value={formData.notification_type}
                      onChange={handleChange}
                      disabled={readOnly}
                    >
                      <option value="system">Системное</option>
                      <option value="user">Пользовательское</option>
                      <option value="group">Групповое</option>
                      <option value="registration">Регистрация</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      readOnly
                      value={
                        formData.notification_type === 'system' ? 'Системное' :
                        formData.notification_type === 'user' ? 'Пользовательское' :
                        formData.notification_type === 'group' ? 'Групповое' : 'Регистрация'
                      }
                    />
                  )}
                </div>
              </div>                  

              <div className='mb-3'>
                <label className="form-label text-start d-block w-100">Отправитель</label>
                <div className='input-group'>
                  <span className='input-group-text text-primary'>
                    <i class="bi bi-person me-1"></i><i class="bi bi-send"></i>
                  </span>
                  {!readOnly ? (
                    <select
                      className="form-select"
                      name="sender"
                      value={formData.sender || ''}
                      onChange={handleChange}
                      disabled={readOnly}
                    >
                      <option value="">Выберите отправителя</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  ) : formData.sender && (
                    <input
                      type="text"
                      className="form-control"
                      readOnly
                      value={users.find(u => u.id === formData.sender)?.username || '-'}
                    />
                  )}
                </div>
              </div>
              
              <div className='mb-3'>
                <label className="form-label text-start d-block w-100">Получатель</label>
                <div className='input-group'>
                  <span className='input-group-text text-primary'>
                    <i class="bi-person me-1"></i> <i class="bi-inbox"></i>
                  </span>
                  {!readOnly && formData.notification_type !== 'group' ? (
                    <select
                      className="form-select"
                      name="recipient"
                      value={formData.recipient || ''}
                      onChange={handleChange}
                      disabled={readOnly}
                    >
                      <option value="">Выберите получателя</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  ) : formData.recipient && (
                    <input
                      type="text"
                      className="form-control"
                      readOnly
                      value={users.find(u => u.id === formData.recipient)?.username || '-'}
                    />
                  )}
                </div>
              </div>
                                         
              {/* {!readOnly && formData.notification_type === 'group' ? (
                <div className="mb-3">
                  <label className="form-label">Группа получателей</label>
                  <select
                    className="form-select"
                    name="group_recipient"
                    value={formData.group_recipient || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : formData.group_recipient && (
                <div className="mb-3">
                  <label className="form-label">Группа получателей</label>
                  <input
                    type="text"
                    className="form-control-plaintext"
                    readOnly
                    value={groups.find(g => g.id === formData.group_recipient)?.name || '-'}
                  />
                </div>
              )} */}
              
              <div className="mb-3">
                <label className="form-label text-start d-block w-100">Сообщение</label>
                <div className='input-group'>
                  <span className='input-group-text text-primary'><i class="bi bi-chat-square-text"></i></span>
                  <textarea
                    // className={`form-control ${readOnly ? 'form-control-plaintext' : ''}`}
                    className='form-control'
                    rows={5}
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    readOnly={readOnly}
                />
                </div>
                
              </div>
              
              {!readOnly && (
                <div className="mb-3">
                  <label className="form-label text-start d-block w-100">Профиль уведоиления</label>
                  <div className='input-group'>
                    <span className='input-group-text text-primary'><i class="bi bi-journal-check"></i></span>
                    {/* <div className='form-control'> */}
                    <div className="form-control form-check">
                      <input
                        className="form-check-input ms-1"
                        type="checkbox"
                        id="is_read"
                        name="is_read"
                        checked={formData.is_read}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="is_read">Прочитано</label>
                    </div>
                    <div className="form-control form-check">
                      <input
                        className="form-check-input ms-1"
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="is_active">Активно</label>
                    </div>
                    <div className="form-control form-check">
                      <input
                        className="form-check-input ms-1"
                        type="checkbox"
                        id="is_new"
                        name="is_new"
                        checked={formData.is_new}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="is_new">
                        Новое
                      </label>
                    </div>
                    {/* </div> */}
                  </div>                  
                </div>
              )}
            </form>
          </div>
          
          <div className="modal-footer border-top-0">
            <button 
              type="button" 
              className={`btn btn-outline-secondary fw-bold me-3 animate__animated ${!readOnly ? `animate__fadeInLeft` : `animate__pulse animate__infinite`}`}              
              onClick={onHide}
              style={{ minWidth: '120px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Закрыть
            </button>
            {!readOnly && (
              <button 
                type="button" 
                className="btn btn-primary fw-bold px-4 animate__animated animate__pulse animate__infinite" 
                onClick={handleSave}
              >
                <i className="bi bi-check-circle-fill me-2"></i>
                Сохранить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationModal;