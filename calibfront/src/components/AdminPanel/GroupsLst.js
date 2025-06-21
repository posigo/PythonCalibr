import React, { useEffect, useState } from 'react'; 
import { useAuth } from '../../context/AuthContext';
import { getGroups } from '../../services/api';
import { toast } from 'react-toastify';

const GroupsLst = () => {

  const { auth } = useAuth();        

  const [groups, setGroups] = useState(null)

  useEffect (()=> {
    if (auth) {
      console.log("GroupLst-effect");
      fetchGroups();
    }
  } ,[auth])

  useEffect(() => {
    console.log("GroupLst-groups->",groups);
  },[groups])

const fetchGroups = async () => {
  try {
    const response = await getGroups();
    console.log("GroupLst-fetchGroups->",response.data);
    setGroups(response.data);
  } 
  catch (error) {
    handleApiError(error);
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
          {groups?.map(group => (
            <tr key={group.id}>
              <td>{group.id}</td>
              <td>{group.name}</td>
              <td>{group.user_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default GroupsLst