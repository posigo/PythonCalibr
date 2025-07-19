import React, { useState, useEffect } from 'react';
// import { Tab, Tabs } from 'react-bootstrap';
import IncomingNotifications from '../../components/Notifications/IncomingNotifications';
import OutgoingNotifications from '../../components/Notifications/OutgoingNotifications';
import AdminNotifications from '../../components/Notifications/AdminNotifications';
import CreateNotifictionModal from '../../components/Notifications/CreateNotificationModal'
import { getCurrentUser } from '../../services/api';
import { toast } from 'react-toastify';

const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState('incoming'); // Активная вкладка
  const [isSuperuser, setIsSuperuser] = useState(false); // Флаг суперпользователя
  const [loading, setLoading] = useState(false);
  const [showCreateNotificationModal, setShowCreateNotificationModal] = useState(false);
  const [refreshOutgoing, setRefreshOutgoing] = useState(0); // Добавляем состояние для обновления
  // Проверяем права пользователя при загрузке компонента
  useEffect(() => {
    const checkUserPermissions = async () => {
      setLoading(true);
      try {
        const user = await getCurrentUser();
        // console.log("user_Notifi=", user)
        setIsSuperuser(user.data.is_superuser);
      } catch (error) {
        toast.error('Ошибка при проверке прав пользователя');
        console.error('Error checking user permissions:', error);
      }
      finally {
        setLoading(false);
      }
    };
    
    checkUserPermissions();
  }, []);

  const renderTabContentCont = () => {
    return (
      <div className="tab-content p-3 border border-top-0 rounded-bottom">
        {renderTabContent()}
      </div>

    )
  }
  const renderTabContent = () => {
    if (loading) return <div className="text-center my-5">Загрузка...</div>;

    switch (activeTab) {
      case 'incoming': 
        return (
          <div
            className={`tab-pane fade ${activeTab === 'incoming' ? 'show active' : ''}`}
            id="incoming"
            role="tabpanel"
          >
            <IncomingNotifications />            
          </div>
        );
      case 'outgoing': 
        return (
          <div
            className={`tab-pane fade ${activeTab === 'outgoing' ? 'show active' : ''}`}
            id="outgoing"
            role="tabpanel"
            aria-labelledby="outgoing-tab"
          >
            <OutgoingNotifications refreshKey={refreshOutgoing}/>            
          </div>
        );
      case 'admin':
        if (isSuperuser) {
          return (
            <div
              className={`tab-pane fade ${activeTab === 'admin' ? 'show active' : ''}`}
              id="admin"
              role="tabpanel"
              aria-labelledby="admin-tab"
            >
              <AdminNotifications />
              <p>Админ-панель уведомлений будет здесь</p>
            </div>
        )
        } 
        else {break } 
      default:
        return <div>Выберите раздел</div>;
    }
  }

  return (     
    <div className="container pt-3 mt-5">
      <h2 className='text-center text-primary fw-bold'>Уведомления</h2>
      
      <div className=' alert alert-primary mt-4 mb-2 row'>
        <div className='col-12'>
          <button 
            className='btn btn-primary w-100 m-0 p-2'
            onClick={() => setShowCreateNotificationModal(true)}
          >
            {/* <i className="bi bi-file-earmark-plus me-2"></i> */}
            <i className="bi bi-plus-circle me-2"></i>
            <i className="bi bi-chat-square-text me-2"></i>           
            {/* <i className="bi bi-megaphone me-2"></i> */}
            Создать уведомление
          </button>
        </div>
      </div>

      <ul className='nav nav-tabs mb-4' id='notificationsTabs' role='tablist'>
        <li className='nav-item' role='presentation'>
          <button 
            className={`nav-link ${activeTab === 'incoming' ? 'active' : ''}`}
            id='incoming-tab'
            type='button'
            role='tab'
            aria-controls='incoming'
            aria-selected={activeTab === 'incoming'}
            onClick={() => setActiveTab('incoming')}
          >
            Входящие              
          </button>
        </li>
        <li className='nav-item' role='presentation'>
          <button 
            className={`nav-link ${activeTab === 'outgoing' ? 'active' : ''}`}
            id='outgoing-tab'
            type='button'
            role='tab'
            aria-controls='outgoing'
            aria-selected={activeTab === 'outgoing'}
            onClick={() => setActiveTab('outgoing')}
          >
            Исходящие
          </button>
        </li>
        { isSuperuser && (
          <li className="nav-item" role='presentation'>
          <button 
            className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
            id='admin-tab'
            role='tab'
            aria-controls='admin'
            aria-selected={activeTab === 'admin'}
            onClick={() => setActiveTab('admin')}
          >
            Админ. уведомлений
          </button>
        </li>
        )}
      </ul> 

      <CreateNotifictionModal 
        show={showCreateNotificationModal}
        onClose={() => setShowCreateNotificationModal(false)}
        onNotificationCreated={() => {
            if (activeTab === 'outgoing') {
                setRefreshOutgoing(prev => prev + 1);
            }
        }}
      />

      {renderTabContentCont()}

    </div>
    
  );
};

export default NotificationsPage;