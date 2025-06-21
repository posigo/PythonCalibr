import React from 'react'

const DeleteConfirmation = ({
  show,           // Флаг отображения модального окна
  calculation,    // Объект с данными расчета
  onClose,        // Функция закрытия модалки
  onConfirm       // Функция подтверждения удаления
}) => {
  if (!show) return null; // Не рендерить если show=false
    return (
      <div        
        className='modal fade show d-block bg-dark bg-opacity-50'        
        style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', position: ''}}
      >
        <div 
          className='modal-dialog modal-dialog-centered overflow-y-auto modal-fullscreen-sm-down mt-5 mb-5 pt-3 pb-3'
        //   className='modal-dialog modal-dialog-centered modal-dialog-scrollable mt-5 mb-5 pt-3 pb-3'
        >
          <div className='modal-content d-flex flex-column flex-grow-1 mt-5 mb-5 overflow-auto'>
            {/* Заголовок модалки */}
            <div className='modal-header bg-danger text-white'>
              <h5 className='modal-title fs-5'>Потверждение удаления</h5>
            </div>
            {/* Тело модалки */}
            <div className='modal-body'>
              <p>Вы действительно хотите удалить этот расчёт?</p>
              {/* Информация о расчете */}
              <div className='card mb-3'>
                <div className='card-body'>
                  <p><strong>ID-{'>'}</strong>{calculation.id}</p>
                  <p><strong>Компонент-{'>'}</strong>{calculation.ComponentName}</p>
                  <p><strong>Дата-{'>'}</strong>{new Date(calculation.DateTime).toLocaleString()}</p>
                  <p><strong>Количество плотностей-{'>'}</strong>{calculation.CountDensities}</p>
                </div>
              </div>
              {/* Предупреждение */}
              <div className='alert alert-warning mb-0'>
                <strong>Внимание!</strong>Будут также удалены все связанные растворы и оптические плотности!
              </div>                    
            </div>
            {/* Футер модалки с кнопками */}
            <div className='modal-footer'>
              <button type='button' className='btn btn-secondary' onClick={onClose}>Нет, отменить</button>
              <button type='button' className='btn btn-danger' onClick={onConfirm}>Да, удалить</button>
            </div>
          </div>
        </div>
      </div>
    );
};

export default DeleteConfirmation;