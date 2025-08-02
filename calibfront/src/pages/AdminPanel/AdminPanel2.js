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
import UsersAdm from '../../components/AdminPanel/UsersAdm'
import GroupsLst from '../../components/AdminPanel/GroupsLst';
import VerifiedUsers from '../../components/AdminPanel/VerifiedUsers';
import UnverifiedUsers from '../../components/AdminPanel/UnverifiedUsers';

const AdminPanel2 = () => {
  const { auth, usrData } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
//   const [users, setUsers] = useState([]);
//   const [verifiedUsers, setVerifiedUsers] = useState([]);
//   const [unverifiedUsers, setUnverifiedUsers] = useState([]);
  const [groups, setGroups] = useState([]);
//   const [notifications, setNotifications] = useState([]);
//   const [actionHistory, setActionHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Состояния для модальных окон
//   const [showEditModal, setShowEditModal] = useState(false);
//   // const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [currentUser, setCurrentUser] = useState(null);
//   const [formData, setFormData] = useState({
//     username: '',
//     password: '',
//     first_name: '',
//     email: '',
//     group_id: '',
//     is_verified: false
//   });
//   const [newUserData, setNewUserData] = useState({
//     username: '',
//     password: '',
//     first_name: '',
//     email: '',
//     group_id: ''
//   });
    

  const fetchAdmins = useCallback(() => {
    console.log("AdminPanel2-fetchAdmins");
    console.log("AdminPanel2-usrData->",usrData)
    if (!usrData) {
      const token = localStorage.getItem('access_token');  
      console.log("adminPanel2-usrData-token->", token);    
      const decodedToken = token ? jwtDecode(token) : null;
      console.log("adminPanel2-usrData-decodedToken->", decodedToken);    
      if (decodedToken) {
        console.log("adminPanel2-usrData-decodedToken.is_superuser->", decodedToken?.is_superuser);    
        setIsSuperUser(decodedToken.is_superuser);
        console.log("adminPanel2-usrData.decodedToken.is_admins=", decodedToken.groups?.some(g => g.name === 'admins'));
        setIsAdmin(decodedToken.groups?.some(group => group === 'admins'));                
      }    
      return;      
    }
    console.log("adminPanel2-usrData.is_superuser->",usrData.is_superuser);      
    setIsSuperUser(usrData.is_superuser)      
    console.log("adminPanel2-usrData.admins->",usrData.groups.some(group => group === 'admins'));
    setIsAdmin(usrData.groups.some(group => group === 'admins'))
    console.log("adminPanel2-isSuperUser", isSuperUser);
    console.log("adminPanel2-isAdmin", isAdmin);    
    if (!isSuperUser && !isAdmin) {
      setActiveTab('groups');
    }
  }, [usrData]);
    
  useEffect(() => {
    console.log("adminpanel2-effect-fetchAdmins");
    if (auth) {
      fetchAdmins();     
    }
  }, [auth, usrData]);
 
  useEffect(() => {
  if (auth) {
      
    //   fetchData();
      fetchGroups();
      // setIsSuperUser(usrData.is_superuser)
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isSuperUser && !isAdmin) {
      setActiveTab('groups');
    }
    else {
      setActiveTab('users');
    }
  },[isAdmin, isSuperUser])

//   const fetchData = async () => {
//     setLoading(true);
//     try {
//       switch (activeTab) {
//         case 'users':
//           if (isSuperUser || isAdmin) {
//             const usersResponse = await getUsers();
//             setUsers(usersResponse.data);
//             console.log("ddd=",usersResponse.data);
//             console.log("sssddd=",users);
//           }
//           break;
//         case 'verified':
//           const verifiedResponse = await getVerifiedUsers();
//           setVerifiedUsers(verifiedResponse.data);
//           console.log("sss=", verifiedUsers);
//           break;
//         case 'unverified':
//           if (isSuperUser || isAdmin) {
//             const unverifiedResponse = await getUnverifiedUsers();
//             setUnverifiedUsers(unverifiedResponse.data);
//           }
//           break;
//         case 'groups':
//           const groupsResponse = await getGroups();
//           setGroups(groupsResponse.data);
//           break;
//         case 'notifications':
//           const notificationsResponse = await getNotifications();
//           setNotifications(notificationsResponse.data);
//           break;
//         case 'history':
//           if (isSuperUser || isAdmin) {
//             const historyResponse = await getActionHistory();
//             setActionHistory(historyResponse.data);
//           }
//           break;
//         default:
//           break;
//       }
//     } catch (error) {
//       handleApiError(error);
//       // console.error('Ошибка загрузки данных:', error);
//       // if (error.response && error.response.status === 403) {
//       //   toast.error('У вас нет прав для просмотра этого раздела');
//       // } else {
//       //   toast.error('Ошибка загрузки данных');
//       // }
//     } finally {
//       setLoading(false);
//     }
//   };

  const fetchGroups = async () => {
    try {
      const response = await getGroups();
      setGroups(response.data);
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

  // const handleEditClick = async (userId) => {
  //   await fetchUser(userId);
  //   setShowEditModal(true);
  // };

  // const handleDeleteClick = (userId) => {
  //   setCurrentUser(users.find(u => u.id === userId));
  //   // setShowDeleteModal(true);
  // };

  // const handleInputChange = (e) => {
  //   const { name, value, type, checked } = e.target;
  //   setFormData(prev => ({
  //     ...prev,
  //     [name]: type === 'checkbox' ? checked : value
  //   }));
  // };

  // const handleNewUserInputChange = (e) => {
  //   const { name, value } = e.target;
  //   setNewUserData(prev => ({
  //     ...prev,
  //     [name]: value
  //   }));
  // };

  // const handleUpdateUser = async () => {
  //   try {
  //     const dataToSend = {
  //       username: formData.username,
  //       first_name: formData.first_name,
  //       email: formData.email,
  //       group_id: formData.group_id,
  //       is_verified: formData.is_verified
  //     };
      
  //     // Добавляем пароль только если он был изменен
  //     if (formData.password) {
  //       dataToSend.password = formData.password;
  //     }

  //     await updateUser(currentUser.id, dataToSend);
  //     toast.success('Пользователь успешно обновлен');
  //     setShowEditModal(false);
  //     fetchData();
  //   } catch (error) {
  //     handleApiError(error);
  //   }
  // };

  // const handleDeleteUser = async () => {
  //   try {
  //     await deleteUser(currentUser.id);
  //     toast.success('Пользователь успешно удален');
  //     //setShowDeleteModal(false);
  //     fetchData();
  //   } catch (error) {
  //     handleApiError(error);
  //   }
  // };

  // const handleAddUser = async () => {
  //   try {
  //     await createUser(newUserData);
  //     toast.success('Пользователь успешно добавлен');
  //     setShowAddModal(false);
  //     setNewUserData({
  //       username: '',
  //       password: '',
  //       first_name: '',
  //       email: '',
  //       group_id: ''
  //     });
  //     fetchData();
  //   } catch (error) {
  //     handleApiError(error);
  //   }
  // };


  // const handleAssignGroup = async (userId, groupName) => {
  //   try {
  //     await assignGroup(userId, groupName);
  //     toast.success('Группа успешно назначена');
  //     fetchData();
  //   } catch (error) {
  //     console.error('Ошибка назначения группы:', error);
  //     toast.error(error.response?.data?.detail || 'Ошибка назначения группы');
  //   }
  // };

  // const handleChangeGroup = async (userId, newGroupName) => {
  //   try {
  //     await changeGroup(userId, newGroupName);
  //     toast.success('Группа успешно изменена');
  //     fetchData();
  //   } catch (error) {
  //     console.error('Ошибка изменения группы:', error);
  //     toast.error(error.response?.data?.detail || 'Ошибка изменения группы');
  //   }
  // };

  const renderTabContentCont = () => {
    if (loading) return <div className="text-center my-5">Загрузка...</div>;
    return (
      <div className="tab-content p-3 border border-top-0 rounded-bottom">
        {renderTabContent()}
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        if (isSuperUser || isAdmin) {
          return (
            <UsersAdm 
              isSuperUser={isSuperUser} isAdmin={isAdmin} />
          )          
        } else {break}
      case 'groups':
        return ( <GroupsLst />);
      case 'verified':
        return (<VerifiedUsers isSuperUser={isSuperUser} isAdmin={isAdmin} />);
      case 'unverified2':            
        if (isSuperUser || isAdmin) {  
          return (<UnverifiedUsers isSuperUser={isSuperUser} isAdmin={isAdmin} />)     
          } else {break};            
      default:
        return <div>Выберите раздел</div>;        
    }
  };

  return (
    <div className='container-fluid pt-2 my-5'>
      <h2 className='text-center fw-bold text-primary'>{constTexts?.nav?.cabnt?.main || 'Административная панель'}</h2>
      <div>
      <ul className="nav nav-tabs mb-4 id='adminPanelTabs' role='tablist'">
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
            className={`nav-link ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            Группы
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
        { (isSuperUser || isAdmin) && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'unverified2' ? 'active' : ''}`}
              onClick={() => setActiveTab('unverified2')}
            >
              Неподтвержденные
            </button>
          </li>
        )}  
                
      </ul>
      </div>
      
      {renderTabContentCont()}

      

    </div>
  );
};

export default AdminPanel2;
