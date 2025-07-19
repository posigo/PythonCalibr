import React, { useState, useEffect } from 'react';
import { 
  getUsers, 
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getGroups
} from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import EditUserModal from './EditUserModal';
import ConfirmDelUserModal2 from './ConfirmDelUserModal2';
import AddUserModal from './AddUserModal';

const UsersAdm = ({isSuperUser, isAdmin}) => {

  const { auth, usrData } = useAuth();                              // подключение auth из контента
  
  const [users, setUsers] = useState([]);                           // список пользователей
  const [loading, setLoading] = useState(false);                    // загрузка
  const [error, setError] = useState(null);                         // сообщение об ошибке  
  const [selectedUser, setSelectedUser] = useState(null);           // выбранный пользователь
  const [groups, setGroups] = useState([]);                         // группы
  // состояния модальных окон
  const [showAddModal, setShowAddModal] = useState(false);          // вызов модального окна для добавления
  const [showEditModal, setShowEditModal] = useState(false);        // вызов модального окна для редактирования
  const [showDeleteModal, setShowDeleteModal] = useState(false);    // вызов модального окна для подтв удаления
  
  useEffect(() => {
    if (auth) {
        fetchData();
        fetchGroups();
    }
  }, [auth, isSuperUser, isAdmin])

  useEffect(() => {
    console.log("UsersAdm-useEffect-selectedUser->", selectedUser)
  }, [selectedUser])

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const usersResponse = await getUsers();
      setUsers(usersResponse.data);
      console.log("usersResponse(room)=",usersResponse.data);                
    }
    catch (error) {
      // setError(error.message)
      handleApiError(error)
    }
    finally {
        setLoading(false)
    }    
  }

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
      setSelectedUser({
        id: response.data.id,
        username: response.data.username,
        password: '',
        first_name: response.data.first_name || '',
        email: response.data.email || '',
        group_id: response.data.groups?.[0]?.id || '',
        is_verified: response.data.profile.is_verified || false,
        registration_date: response.data.registration_date || null,
        verification_date: response.data.verification_date || null
      });
    } 
    catch (error) {
      handleApiError(error)
    }
  }

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

  const handleUpdateUserClick = async (userId) => {
    await fetchUser(userId);    
    console.log("UsersAdm-handleUpdateUserClick-selectedUser->", selectedUser)
    setShowEditModal(true);
  };

  const handleUpdateUser = async (DataToSend) => {      
    try {
      console.log("UsersAdm-handleUpdateUser-selectedUser.id->", selectedUser.id);      
      console.log("UsersAdm-handleUpdateUser-selectedUser->", selectedUser);  
      console.log("UsersAdm-handleUpdateUser-DataToSend->", DataToSend);
      let patchData = {}
      const allKeys = new Set([...Object.keys(DataToSend)]);
      for (const key of allKeys) {
        if (key === 'id' || key === 'password') continue;
        if (DataToSend[key] !== null && (DataToSend[key] !== selectedUser[key])) {
            patchData[key] = DataToSend[key]
        }
      }
      if (DataToSend.password) {
        patchData['password'] = DataToSend['password']
      }
      
      console.log("UsersAdm-handleUpdateUser-patchData->", patchData);

      const response = await updateUser(selectedUser.id, patchData);
      console.log("UsersAdm-handleUpdateUser-response->", response)
    //   setUsers(users.map(u => 
    //     u.id === selectedUser.id ? DataToSend : u
    //   ))
      toast.success('Пользователь успешно обновлен');      
      setShowEditModal(false);
      fetchData();
    }
      catch (error) {
        console.error('Ошибка:', error);
        if (error.response?.status === 401) {
          toast.error('У вас нет необходимых разрешений');
        } 
        else if (error.response?.status === 403) {
          toast.error('У вас нет прав для этого действия');
        } 
        else {
          toast.error('Произошла ошибка');
        }
      }
    };

  const handleDeleteUserClick = (sel_user) => {
    alert(sel_user.id)
    setSelectedUser(sel_user);
    setShowDeleteModal(true);
    console.log("userAdm-selectedUser->", selectedUser)
  }

  const handleDeleteUser = async () => {
    try {
          await deleteUser(selectedUser.id);
          toast.success('Пользователь успешно удален');
          setShowDeleteModal(false);
          fetchData();
        } 
        catch (error) {
          console.error('Ошибка:', error);
          if (error.response?.status === 401) {
            toast.error('У вас нет необходимых разрешений');
          } 
          else if (error.response?.status === 403) {
            toast.error('У вас нет прав для этого действия');
          } 
          else {
            toast.error('Произошла ошибка');
          }
        }
  }

  const handleAddUser = async (dataToSend) => {
      try {
        await createUser(dataToSend);
        toast.success('Пользователь успешно добавлен');
        setShowAddModal(false);
        // setNewUserData({
        //   username: '',
        //   password: '',
        //   first_name: '',
        //   email: '',
        //   group_id: ''
        // });
        fetchData();
      } catch (error) {
        handleApiError(error);
      }
    };
  

  if (loading) return <div className="text-center my-5">Загрузка...</div>;
   
  return (
    <div className='container-fluid mb-3'>
      <button 
        className="btn btn-primary mb-3 w-100"
        onClick={() => setShowAddModal(true)}
      >
        <i className="bi bi-person-plus me-1"></i>
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
                  {/* вариант 1 */}
                  {/* <button 
                    className="btn btn-sm btn-warning me-2"  // вариант 1                    
                      //onClick={() => handleEditClick(user.id)}
                    >
                      <i class="bi bi-pen me-1"></i>
                      Изменить
                  </button>                   */}                  
                  {/* вариант 2 */}
                  {/* <button                     
                    className={`btn btn-sm btn-warning me-2 ${user.username === usrData.username ? `border border-5 border-primary` : ``}`}                     
                      //onClick={() => handleEditClick(user.id)}
                    >
                      <i class="bi bi-pen me-1"></i>
                      Изменить
                  </button>                   */}
                  {/* вариант 3 */}
                  {/* <button 
                    className={`btn btn-sm btn-warning me-2 ${user.username === usrData.username ? 'blinking-border' : ''}`} // вариант 3
                    
                      //onClick={() => handleEditClick(user.id)}
                    >
                      <i class="bi bi-pen me-1"></i>
                      Изменить
                  </button>                   */}
                  {/* <style jsx>{`
                    .blinking-border {
                      border: 3px solid #0d6efd;
                      animation: blink 1s infinite;
                    }
                    @keyframes blink {
                      0% { border-color: #0d6efd; }
                      50% { border-color: transparent; }
                      100% { border-color: #0d6efd; }
                    }
                  `}</style> */}
                  {/* вариант 4 */}
                  {/* <button                                         
                    className={`btn btn-sm btn-warning me-2 ${user.username === usrData.username ? 'rainbow-border' : ''}`}  // вариант 4                    
                      //onClick={() => handleEditClick(user.id)}
                    >
                      <i class="bi bi-pen me-1"></i>
                      Изменить
                  </button>                   
                  <style jsx>{`
                    .rainbow-border {
                      border: 3px solid;
                      animation: rainbow 2s linear infinite;
                    }
                    @keyframes rainbow {
                      0% { border-color: red; }
                      16% { border-color: orange; }
                      33% { border-color: yellow; }
                      50% { border-color: green; }
                      66% { border-color: blue; }
                      83% { border-color: indigo; }
                      100% { border-color: violet; }
                    }
                  `}</style> */}
                  {/* вариант 5 */}
                  <button                     
                    className={`btn btn-sm me-2 ${user.username === usrData.username ? 'highlight-btn' : 'btn-warning'}`}  // вариант 5
                    onClick={() => handleUpdateUserClick(user.id)}
                    >
                      <i class="bi bi-pen me-1"></i>
                      Изменить
                  </button>
                  <style jsx>{`
                    .highlight-btn {
                      background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000);
                      background-size: 400%;
                      border: none;
                      color: white;
                      text-shadow: 0 0 5px black;
                      animation: glowing 3s linear infinite;
                      box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
                    }
                    @keyframes glowing {
                      0% { background-position: 0 0; }
                      100% { background-position: 400% 0; }
                    }
                  `}</style>
                  {/* вариант 6 */}
                  {/* <button                     
                    className={`btn btn-sm me-2 ${user.username === usrData.username ? 'super-highlight' : 'btn-warning'}`}  // вариант 6
                      //onClick={() => handleEditClick(user.id)}
                    >
                      <i class="bi bi-pen me-1"></i>
                      Изменить
                  </button>                   */}
                  {/* <style jsx>{`
                    .super-highlight {
                      background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00);
                      border: 3px solid;
                      animation: 
                        rainbow-border 2s linear infinite,
                        pulse 0.5s ease infinite alternate;
                      color: white;
                      text-shadow: 0 0 3px black;
                      font-weight: bold;
                    }
                    @keyframes rainbow-border {
                      0% { border-color: red; }
                      33% { border-color: yellow; }
                      66% { border-color: orange; }
                      100% { border-color: red; }
                    }
                    @keyframes pulse {
                      from { transform: scale(1); }
                      to { transform: scale(1.05); }
                    }
                  `}</style> */}
                  {/* вариант 7 */}
                  {/* <button 
                    className={`btn btn-sm me-2 position-relative overflow-hidden 
                      ${user.username === usrData.username 
                      ? 'btn-danger border border-5 border-warning shadow-lg' 
                      : 'btn-warning'}`}
                  >
                    <i className="bi bi-pen me-1"></i>
                    Изменить
                    {user.username === usrData.username && (
                      <span className="position-absolute top-0 start-0 w-100 h-100 bg-warning opacity-25" 
                      style={{animation: 'pulse 1.5s infinite'}}></span>
                    )}
                  </button>
                  <style jsx>{`
                    @keyframes pulse {
                      0% { transform: scale(1); opacity: 0.25; }
                      50% { transform: scale(1.5); opacity: 0.1; }
                      100% { transform: scale(1); opacity: 0.25; }
                    }
                  `}</style> */}
                  
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteUserClick(user)}
                    // onClick={() => alert(user.id)}                    
                    disabled={
                      (isAdmin && (user.groups.some(gr => gr.name === 'admins') || user.username === 'admin')) ||
                      (isSuperUser && user.username === 'admin')
                    }                    
                  >                    
                    <i class="bi bi-trash me-1"></i>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {console.log("userAdm-selectedUser-2->", selectedUser)}

      <EditUserModal
        show={showEditModal} 
        onHide={() => setShowEditModal(false)}
        updateUser={selectedUser}
        onUpdateUser={handleUpdateUser}
        readonly={(isAdmin && (selectedUser?.groups?.some(gr => gr.name === 'admins') || selectedUser?.username === 'admin')) ||
                      (isSuperUser && selectedUser?.username === 'admin')}        
        groups={groups}
      />

      <ConfirmDelUserModal2 
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteUser}
        title='Подтвердите действие -- удаление'
        message={`Вы уверены?!, что хотите удалить пользователя #${selectedUser?.id}-${selectedUser?.username}(${selectedUser?.groups?.map(g => g.name).join(', ')}). Отменить будет невозможно! `}
      />      
      <AddUserModal 
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onCreateUser={handleAddUser}
        groups={groups}
      />
    </div> 
    
  )
}

export default UsersAdm