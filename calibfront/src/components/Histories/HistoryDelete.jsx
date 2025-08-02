
import React from 'react';
import { getActionHistoryItem, softDeleteActionHistory } from '../../services/api';

const HistoryDelete = ({ id, onClose }) => {
    const handleDelete = async () => {
        try {
            await softDeleteActionHistory(id); // PATCH /history/{id}/ -> is_deleted=True
            alert('Запись удалена (помечена).');
            onClose();
            window.location.reload(); // Обновим данные
        } catch (error) {
            alert('Ошибка при удалении.');
        }
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Подтвердите удаление</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <p>Вы действительно хотите удалить эту запись истории? Она будет скрыта, но может быть восстановлена администратором.</p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
                        <button type="button" className="btn btn-danger" onClick={handleDelete}>Удалить</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoryDelete;