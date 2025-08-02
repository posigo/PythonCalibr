
import React, { useState, useCallback, useEffect } from 'react';
import HistoryView from '../../components/Histories/HistoryView';
import { useAuth } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

const HistoryPanel = () => {
  const { auth, usrData } = useAuth();
  const [activeTab, setActiveTab] = useState('historyExisting');
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchAdmins = useCallback(() => {         
    if (!usrData) {
      const token = localStorage.getItem('access_token');            
      const decodedToken = token ? jwtDecode(token) : null;          
      if (decodedToken) {            
        setIsSuperUser(decodedToken.is_superuser);            
      }                      
    } else {
      setIsSuperUser(usrData['is_superuser'])
    }
  }, [usrData, auth]);

  useEffect(() => {
    if (auth) {
      fetchAdmins();     
    }
  }, [auth, usrData]);

  useEffect(() => {        
    if (!isSuperUser) {
      return;     
    }
  }, [isSuperUser]);  

  if (!isSuperUser) {
    return (
      <>
        <div className='container-fluid my-5 py-5'>
          <h2 className='text-danger'>У вас нет прав для просмотра истории действий!!!</h2>  
        </div>
      </>
    )
  }

  const renderTabContentCont = () => {
    if (loading) return <div className="text-center my-0">Загрузка...</div>;
    return (
      <div className="tab-content p-3 border border-top-0 rounded-bottom">
        {renderTabContent()}
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'historyExisting':
        return ( <>11111111<HistoryView typeDelete="soft"/></> );
        
      case 'historyDelete':
        return ( <>222222222222222<HistoryView typeDelete="hard"/></> )
        //return ( <><h2>РАЗРВБОТКА....</h2></>);      
      default:
        return <div>Выберите раздел</div>;        
    }
  };

  return (
    <div className="container-fluid my-5 py-3">
      <h2 className='text-center fw-bold text-primary pb-2'>История действий</h2>  
      <div>
        <ul className="nav nav-tabs mb-0 id='adminPanelTabs' role='tablist'">        
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'historyExisting' ? 'active' : ''}`}
              onClick={() => setActiveTab('historyExisting')}
            >
              История действий
            </button>
          </li>        
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'historyDelete' ? 'active' : ''}`}
              onClick={() => setActiveTab('historyDelete')}
            >
              Записи помечанные на удаление
            </button>
          </li>   
        </ul>
      </div>      
      {renderTabContentCont()}
      {/* <HistoryView /> */}
    </div>
  );
};

export default HistoryPanel;