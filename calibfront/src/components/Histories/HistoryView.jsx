
import React, { useState, useEffect } from 'react';
import { useActionHistory } from './HistoryLoad';
import HistoryDelete from './HistoryDelete';
import HistoryPurge from './HistoryPurge';
import ConfirmationNotificationModal from '../Notifications/ConfirmationNotificationModal';
import ConfirmationModal from '../ConfirmationModal';
import DeleteRecordHistory from './DeleteRecordHistory';
import { restoreActionHistory } from '../../services/api';

const HistoryView = ({ typeDelete }) => {
  console.log("HistoryView-typeDelete", typeDelete)
  
  const [filters, setFilters] = useState({
    action_type: '',
    user: '',
    start_date: '',
    end_date: '',
  });
  const [tempFilters, setTempFilters] = useState({
    user: '',
  });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [pagination, setPagination] = useState(20);
  const [tempPagination, setTempPagination] = useState(20);  
  
  const { data, loading, error, total, pageSize, refetch } = useActionHistory(filters, page, pagination, typeDelete);

  useEffect(() => {
    // При изменении pagination или page будет автоматически вызываться refetch
    // через хук useActionHistory
    applyPagination();
  }, [pagination, page]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name !== 'user') {
       setFilters(prev => ({ ...prev, [name]: value }));
       setPage(1);
    } else {
      setTempFilters(prev => ({ ...prev, [name]:value}))
    }
  };

  const applyUserFilter = () => {
    if (tempFilters.user !== filters.user) {
      setFilters(prev => ({ ...prev, user: tempFilters.user }));
      setPage(1);
    }
  };

  const handleUserKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyUserFilter();
      e.target.blur();
    }
  };

  const handleUserBlur = () => {
    applyUserFilter();
   };

  const handlePaginationChange = (e) => {
    const value = parseInt(e.target.value || 20);
    setTempPagination(Math.min(Math.max(1, value), 100));
  };

  const applyPagination = () => {
    console.log("2tmppgina", tempPagination)
    console.log("3pgina", pagination)
    if (tempPagination !== pagination) {
      setPagination(tempPagination);
      setPage(1);
    }
  };

  // Автоматически применяем изменения при потере фокуса или нажатии Enter
  const handlePaginationBlur = () => {
    applyPagination();
    console.log("1pgina", pagination)
  };

  const handlePaginationKeyDown = (e) => {
    if (e.key === 'Enter') {
      applyPagination();
      e.target.blur();
    }
  };

  const handleDelete = async () => {
    setShowDeleteModal(false);
    console.log("histview-handl-delete-typedelete->", typeDelete);
    try {
      await DeleteRecordHistory(selectedId, typeDelete);

      await refetch(); // ✅ обновляем данные
    } catch (err) {
      //setError('Ошибка при удалении');
    }

     // Опционально: если страница пуста и не первая — перейти назад
    if (data.length === 1 && page > 1) {
      const newTotal = total - 1;
      const totalPages = Math.ceil(newTotal / pageSize);
      if (page > totalPages) {
        setPage(totalPages || 1);
      }

     // Если после удаления данных нет, и это не первая страница — перейти на предыдущую
  // if (data.length === 1 && page > 1 && !loading && data.length === 0) {
  //   setPage(page - 1);
  }
    // if (page > Math.ceil(total/pagination)) {
    //   setPage(Math.ceil(total/pagination))
    // } else {
    //     setPage(page);
    // }
    
  };

  const openDeleteModal = (id) => {
        setSelectedId(id);
        setShowDeleteModal(true);
  };

    // const openPurgeModal = (id) => {
    //     setSelectedId(id);
    //     setShowPurgeModal(true);
    // };

  if (loading) return <div className="alert alert-info">Загрузка...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className=' w-100 mx-auto' style={{ maxWidth: '1600px' }}>
      {/* Фильтры */}
      <div className="row mb-3">
        {/* пользователь */}
        <div className="col-md-2">
          <input
            type="text"
            name="user"
            className="form-control"
            placeholder="Пользователь (username)"
            value={tempFilters.user}
            onChange={handleFilterChange}
            onBlur={handleUserBlur}
            onKeyDown={handleUserKeyDown}
          />
        </div>
        {/* действия */}
        <div className="col-md-2">
          <select
            name="action_type"
            className="form-control"
            value={filters.action_type}
            onChange={handleFilterChange}
          >
            <option value="">Все действия</option>
            {Object.entries({
              login: 'Вход',
              logout: 'Выход',
              registration: 'Регистрация',
              verification: 'Подтверждение',
              group_change: 'Изменение группы',
              profile_update: 'Обновление профиля',
              notification_sent: 'Отправка уведомления',
              notification_read: 'Прочтение уведомления',
              user_delete: 'Удаление пользователя',
              calculation_create: 'Создание расчета',
              calculation_update: 'Обновление расчета',
              calculation_delete: 'Удаление расчета',
              password_reset: 'Сброс пароля',
            }).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {/* дата с */}
        <div className="col-md-3">
          <input
            type="date"
            name="start_date"
            className="form-control"
            value={filters.start_date}
            onChange={handleFilterChange}
          />
        </div>
        {/* дата по */}
        <div className="col-md-3">
          <input
            type="date"
            name="end_date"
            className="form-control"
            value={filters.end_date}
            onChange={handleFilterChange}
          />
        </div>
        {/* пагинация */}
        <div className="col-md-2">
          <div className="input-group">
            <span className="input-group-text">На странице:</span>
            <input
              type="number"
              min="10"
              max="100"
              step="10"
              name="pagination"
              className="form-control"           
              value={tempPagination}
              onChange={handlePaginationChange}
              onBlur={handlePaginationBlur}
              onKeyDown={handlePaginationKeyDown}
            />
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="table-responsive" style={{ maxHeight: '100vh', overflowY: 'auto', overflowX: 'auto' }}>
        <table className="table table-striped table-hover" >
          <thead>
            <tr>
              <th>ID</th>
              <th>Пользователь</th>
              <th>Действие</th>
              <th>Дата</th>
              <th>Описание</th>
              <th>IP</th>
              {typeDelete === 'hard' ? (<th>Восстановить</th>) : (<></>)}
              <th>Удалить</th>              
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.user?.username || 'Система'}</td>
                <td>{item.action_type_display || item.action_type}</td>
                <td>{new Date(item.action_date).toLocaleString()}</td>
                <td>{item.description}</td>
                <td>{item.ip_address}</td>
                {typeDelete === 'hard' ? (
                  <td>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={async () => {
                        await restoreActionHistory(item.id).catch(console.error("error restore"));
                        await refetch();
                      }}                    
                    >
                      <i className="bi bi-eye"></i>
                    </button>
                  </td>
                ) : (<></>)}
                <td>                  
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => openDeleteModal(item.id)}                    
                  >
                    {typeDelete === 'hard' ? (<i className="bi bi-trash"></i>) : (<i className="bi bi-eye-slash"></i>)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      <nav aria-label="Навигация по страницам" className='mt-3'>
        <ul className="pagination justify-content-center flex-wrap gap-2">
          {/* В начало */}
          <li className={`page-item ${page <= 1 ? 'disabled' : 'shadow-sm'}`} title="Перейти к первой странице">
            <button 
              className="page-link py-2 px-3 rounded-3 border animate__animated" 
            onClick={(e) => {
              setPage(1);
              // Анимация при клике
              const btn = e.currentTarget;
              btn.classList.add('animate__rubberBand');
              setTimeout(() => btn.classList.remove('animate__rubberBand'), 1000);
            }} 
            disabled={page <= 1} 
            aria-label="В начало"
            onMouseEnter={(e) => e.currentTarget.classList.add('animate__pulse')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('animate__pulse')}
            >
              <i className="bi bi-chevron-double-left"></i>
            </button>
          </li>
          {/* Назад */}
          <li className={`page-item ${page <= 1 ? 'disabled' : 'shadow-sm'}`} title="Предыдущая страница">
            <button
              className="page-link py-2 px-3 rounded-3 border animate__animated"
            onClick={(e) => {
              setPage(page - 1);
              // Анимация при клике
              const btn = e.currentTarget;
              btn.classList.add('animate__rubberBand');
              setTimeout(() => btn.classList.remove('animate__rubberBand'), 1000);
            }}
            disabled={page <= 1}
            aria-label="Назад"
            onMouseEnter={(e) => e.currentTarget.classList.add('animate__pulse')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('animate__pulse')}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            </li>
            {/* Информация о текущей странице */}
            <li className="page-item disabled mx-2">
            <span 
              className="page-link bg-primary text-white fw-bold px-4 py-2 rounded-pill"
              style={{ minWidth: '140px', textAlign: 'center' }}
            > 
              Стр. {page} из {Math.ceil(total/pagination) || 1}
            </span>
            </li>
          {/* Вперед */}
          <li className={`page-item ${page >= Math.ceil(total/pagination) ? 'disabled' : 'shadow-sm'}`} title="Следующая страница">
            <button
              className="page-link py-2 px-3 rounded-3 border animate__animated"
              onClick={(e) => {
              setPage(page + 1);
              // Анимация при клике
              const btn = e.currentTarget;
              btn.classList.add('animate__rubberBand');
              setTimeout(() => btn.classList.remove('animate__rubberBand'), 1000);
              }}
              disabled={page >= Math.ceil(total/pagination)}
              aria-label="Вперед"
              onMouseEnter={(e) => e.currentTarget.classList.add('animate__pulse')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('animate__pulse')}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </li>
          {/* В конец */}
          <li className={`page-item ${page >= Math.ceil(total/pagination) ? 'disabled' : 'shadow-sm'}`} title="Перейти к последней странице">
            <button 
              className="page-link py-2 px-3 rounded-3 border animate__animated" 
            onClick={(e) => {
              setPage(Math.ceil(total/pagination))
              // Анимация при клике
              const btn = e.currentTarget;
              btn.classList.add('animate__rubberBand');
              setTimeout(() => btn.classList.remove('animate__rubberBand'), 1000);
            }}
            disabled={page >= Math.ceil(total/pagination)}
            aria-label="В конец"
            onMouseEnter={(e) => e.currentTarget.classList.add('animate__pulse')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('animate__pulse')}
            >
              <i className="bi bi-chevron-double-right"></i></button>
          </li>
        </ul>
      </nav>

            {/* Модальные окна */}
            {/* {showDeleteModal && (
                <HistoryDelete
                    id={selectedId}
                    onClose={() => setShowDeleteModal(false)}
                />
            )}
            {showPurgeModal && (
                <HistoryPurge
                    id={selectedId}
                    onClose={() => setShowPurgeModal(false)}
                />
            )} */}

      <ConfirmationModal 
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)} 
        onConfirm={handleDelete} 
        type = {typeDelete === 'hard' ? 'critical': 'warning'} 
        title = 'Подтвердите действия' 
        message = {typeDelete === 'hard' ? 
          `Вы уверены?! что хотите выполнить удаление этой записи (#${selectedId}) из истории? Востановление этой записи будет невозможным!.` : 
          `Вы уверены?! что хотите выполнить удаление этой записи (#${selectedId}) из истории? Она будет скрыта, но может быть восстановлена администратором.` 

        }
      />

      

    </div>
    );
};

export default HistoryView;