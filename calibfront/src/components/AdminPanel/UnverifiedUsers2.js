import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getUnverifiedUsers, getGroups, assignGroup } from "../../services/api";
import { toast } from "react-toastify";

const UnverifiedUsers2 = ({isSuperUser, isAdmin}) => {

  const { auth } = useAuth();

  const [unverifiedUsers, setUnverifiedUsers] = useState([]);
  const [groups, setGroups] = useState([]);  
  const [selectedGroups, setSelectedGroups] = useState({});

  useEffect(() => {
    if (auth) {
        fetchUnverifiedUsers();
        fetchGroups();
    }
  }, [auth, isSuperUser, isAdmin])

  const fetchUnverifiedUsers = async() => {
    try {
      const unverifiedResponse = await getUnverifiedUsers();
      setUnverifiedUsers(unverifiedResponse.data);      
    }
    catch(error) {
      handleApiError(error)
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

  const handleAssignGroup = async (userId, groupName) => {
    if (!groupName) return;
    try {
      await assignGroup(userId, groupName);
      toast.success('Группа успешно изменена');
      setSelectedGroups(prev => ({
        ...prev,
        [userId]: ''
      }))
      fetchUnverifiedUsers();
    } catch (error) {
      console.error('Ошибка изменения группы:', error);
      toast.error(error.response?.data?.detail || 'Ошибка изменения группы');
      setSelectedGroups(prev => ({
        ...prev,
        [userId]: ''
      }))
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

  return (
    <div className="table-responsive">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>Имя пользователя</th>            
            {(isSuperUser || isAdmin) ? (<th>Действия</th>) : (<></>)}
          </tr>
        </thead>
        <tbody>
          {unverifiedUsers.map(user => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.username}</td>              
              {(isSuperUser || isAdmin) ? ( 
                <td>
                  <select 
                    className="form-select form-select-sm"
                    value={selectedGroups[user.id] || ''}
                    // onChange={(e) =>  handleChangeGroup(user.id, e.target.value)}
                    onChange={(e) => {
                      setSelectedGroups(prev => ({
                        ...prev,
                        [user.id]: e.target.value
                      }));
                      handleAssignGroup(user.id, e.target.value)
                    }}
                  >
                    <option value=''>Назначить группу</option>
                    {
                      groups
                        .filter(group => {
                          if (isSuperUser) return true;
                          if (isAdmin) return group.name.toLowerCase() !== 'admins';
                          return false
                        })
                        .map(group => (
                          <option key={group.id} value={group.name}>{group.name}</option>
                        ))
                    }
                  </select>
                </td>
              ) : (
                <></>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UnverifiedUsers2;