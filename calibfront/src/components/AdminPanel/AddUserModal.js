import React, { useState, useEffect } from 'react';
import { updateUser } from '../../services/api';
import { toast } from 'react-toastify';

const AddUserModal = ({
  show=false,
  onHide=null,
  onCreateUser=null,    
  groups=null
}) => {

  const [formData, setFormData] = useState({
      username: '',
      password: '',
      first_name: '',
      email: '',
      group_id: ''
    });
    
//   useEffect(() => {
//     if (updateUser) {
//       setFormData({
//         username: updateUser?.username || null,
//         password: updateUser?.password || null,
//         first_name: updateUser?.first_name || null,
//         email: updateUser?.email || '',
//         group_id: updateUser?.group_id || null,
//         is_verified: updateUser?.is_verified || false      
//       })
//     }
//     console.log("EditUserModal-useEffect-formDate->", formData);
//   }, [updateUser])

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddUserClick = async () => {
      try {
        onCreateUser(formData)
        setFormData({
          username: '',
          password: '',
          first_name: '',
          email: '',
          group_id: ''
        })

        console.log("EditUserModal-HandleUpdateUser-formData->", formData);
        //console.log("EditUserModal-HandleUpdateUser-dataToSend->", dataToSend);

        // onUpdateUser(dataToSend);
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
        <div className='modal-content border border-3 border-primary shadow-lg'>
          <div className='modal-header bg-primary text-white'>
            <h5 className='modal-title fw-bold'>
              <i className="bi bi-file-earmark-plus me-2"></i>
              <i className="bi bi-person me-2"></i>
              Создать пользователя
            </h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onHide}
              aria-label="Close"
            ></button>
          </div>
          <div 
            // className="modal-body overflow-auto" style={{ maxHeight: '70vh' }}
            className="modal-body overflow-auto h-75"
          >
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Имя пользователя*</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i class="bi bi-person me-2"></i></span>
                <input
                  type="text"
                  className="form-control"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                />
              </div>              
            </div>
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Пароль*</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i class="bi bi-key me-2"></i></span>
                <input
                  type="password"
                  className="form-control"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Имя*</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i className='bi bi-person-badge me-2'></i></span>
                <input
                  type="text"
                  className="form-control"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                />            
              </div>
            </div>
            <div className="mb-3">
              <label className='form-label text-start d-block w-100'>Email</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i className='bi bi-envelope me-2'></i></span>
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
              <label className='form-label text-start d-block w-100'>Группа*</label>
              <div className='input-group'>
                <span className='input-group-text text-primary'><i className='bi bi-people me-2'></i></span>
                <select
                  className="form-select"
                  name="group_id"
                  value={formData.group_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Выберите группу</option>
                  {groups?.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>              
            </div>            
          </div>
          <div className="modal-footer">
            <button 
              type='button' 
              className='btn btn-outline-secondary fw-bold me-3 animate__animated animate__fadeInLeft' 
              onClick={onHide}
              style={{ minWidth: '120px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Отмена
            </button>
            <button 
              type='button' 
              className='btn btn-primary fw-bold px-4 animate__animated animate__pulse animate__infinite' 
              onClick={handleAddUserClick}
              disabled={!formData.username || !formData.password || !formData.first_name || !formData.group_id}
            >
              <i class="bi bi-check-circle me-2"></i>
              Добавить
            </button>
          </div>
        </div>    
      </div>
    </div>    
  )
}

export default AddUserModal;