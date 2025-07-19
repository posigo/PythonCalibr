import React, { useState, useEffect } from 'react';
import { updateUser } from '../../services/api';
import { toast } from 'react-toastify';

const EditUserModal = ({
  show=false,
  onHide=null,
  updateUser=null,
  onUpdateUser=null, 
  readonly=false,  
  groups=null
}) => {

  const [formData, setFormData] = useState({
      username: '',
      password: '',
      first_name: '',
      email: '',
      group_id: '',
      is_verified: false
    });
    
  useEffect(() => {
    if (updateUser) {
      setFormData({
        username: updateUser?.username || null,
        password: updateUser?.password || null,
        first_name: updateUser?.first_name || null,
        email: updateUser?.email || '',
        group_id: updateUser?.group_id || null,
        is_verified: updateUser?.is_verified || false      
      })
    }
    console.log("EditUserModal-useEffect-formDate->", formData);
  }, [updateUser])

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleUpdate = async () => {
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

        console.log("EditUserModal-HandleUpdateUser-formData->", formData);
        console.log("EditUserModal-HandleUpdateUser-dataToSend->", dataToSend);

        onUpdateUser(dataToSend);
        console.log("EditUserModal-HandleUpdateUser-onUpdateUser_runOk");
        // await updateUser(updateUser.id, dataToSend);
        // toast.success('Пользователь успешно обновлен');
        // setShowEditModal(false);
        // fetchData();
        // onHide();
      } 
      catch (error) {
        handleApiError(error);
      }
    };
  
  if (!show) return null;

  return (
    <div 
      className="modal modal-backdrop fade show d-block animate__animated animate__faster animate__fadeIn" 
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      tabIndex='-1'
      onKeyDown={(e) => e.key === 'Escape' && onHide()}
      onClick={(e) => e.target === e.currentTarget && onHide()}
    >
      <div className='modal-dialog modal-dialog-centered modal-dialog-scrollable animate__animated animate__faster animate__zoomIn'>
        <div className={`modal-content border border-3 ${readonly ? `border-primary` : `border-warning`} shadow-lg `}>
          <div className={`modal-header ${readonly ? `bg-primary text-white` : `bg-warning text-black`}`}>
            <h5 className='modal-title fw-bold'>
              <i className={!readonly ? `bi bi-pencil me-1` : `bi bi-eye`}></i>
              <i className="bi bi-person me-2"></i>
              {!readonly ? 'Редактирование пользователя' : 'Просмотр пользователя'}
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
              aria-label="Close"
              // onClick={() => setShowEditModal(false)}
            ></button>
          </div>
          <div 
            // className="modal-body overflow-auto" style={{ maxHeight: '70vh' }}
            className="modal-body overflow-auto h-75"
          >
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Имя пользователя</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i class='bi bi-person me-2'></i></span>
                <input
                  type="text"
                  className="form-control"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={readonly}
                />
              </div>              
            </div>
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Пароль (оставьте пустым, чтобы не менять)</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i className='bi bi-key me-2'></i></span>
                <input
                  type="password"
                  className="form-control"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={readonly}
                />
              </div>
            </div>
            <div className="mb-3">
              <label>Имя</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i className='bi bi-person-badge me-2'></i></span>
                <input
                  type="text"
                  className="form-control"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={readonly}
                />
              </div>              
            </div>
            <div className="mb-3">
              <label className="form-label text-start d-block w-100">Email</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i className='bi bi-envelope    '></i></span>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>              
            </div>
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Группа</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i className='bi bi-people me-2'></i></span>
                <select
                  className="form-select"
                  name="group_id"
                  value={formData.group_id}
                  onChange={handleInputChange}
                  disabled={readonly}
                >
                  <option value="">Выберите группу</option>
                  {groups?.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>              
            </div>
            <div className="mb-3">
              <div className='input-group w-100'>
                <span className='input-group-text text-primary'><i className='bi bi-ui-checks me-2'></i></span>
                <div className='form-control form-check'>
                  <input
                    type='checkbox' 
                    className='form-check-input ms-1'
                    name="is_verified"
                    checked={formData.is_verified}
                    onChange={handleInputChange}
                    id="isVerifiedCheck
                    disabled={readonly}"
                  />
                  <label className="form-check-label" htmlFor="isVerifiedCheck">
                    Подтвержден
                  </label>
                </div>                
              </div>              
             
            </div>
          </div>
          <div className='modal-footer border-top-0'>
            <button 
              type='button' 
              className={`btn btn-outline-secondary fw-bold me-3 animate__animated ${!readonly ? 'animate__fadeInLeft' : 'animate__pulse animate__infinite'}`} 
              onClick={onHide}
              style={{ minWidth: '120px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Отмена
            </button>
            {!readonly && (
              <button 
                type='button' 
                className='btn btn-primary fw-bold px-4 animate__animated animate__pulse animate__infinite' 
                onClick={handleUpdate }
                disabled={readonly}
              >
                <i class="bi bi-check-circle me-2"></i>
                Обновить
              </button>    
            )}            
          </div>
        </div>    
      </div>
    </div>    
  )
}

export default EditUserModal;