import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getVerifiedUsers, getGroups, changeGroup } from "../../services/api";
import { toast } from "react-toastify";

const VerifiedUsers = ({isSuperUser, isAdmin}) => {

  const { auth } = useAuth();

  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [groups, setGroups] = useState([]);  
  const [selectedGroups, setSelectedGroups] = useState({});

  useEffect(() => {
    if (auth) {
        fetchVerifiedUsers();
        fetchGroups();
    }
  }, [auth, isSuperUser, isAdmin])

  const fetchVerifiedUsers = async() => {
    try {
      const verifiedResponse = await getVerifiedUsers();
      setVerifiedUsers(verifiedResponse.data);      
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

  const handleChangeGroup = async (userId, newGroupName) => {
    if (!newGroupName) return;
    try {
      await changeGroup(userId, newGroupName);
      toast.success('Группа успешно изменена');
      setSelectedGroups(prev => ({
        ...prev,
        [userId]: ''
      }))
      fetchVerifiedUsers();
    } catch (error) {
      console.error('Ошибка изменения группы:', error);
      toast.error(error.response?.data?.detail || 'Ошибка изменения группы');
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
                      handleChangeGroup(user.id, e.target.value)
                    }}
                  >
                    <option value="">Изменить группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.name}>{group.name}</option>
                    ))}
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

export default VerifiedUsers;