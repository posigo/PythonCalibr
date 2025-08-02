
import React from 'react';
import { hardDeleteActionHistory } from '../../services/api'; // DELETE /history/{id}/

const HistoryPurge = ({ id, onClose }) => {
    const handlePurge = async () => {
        try {
            await hardDeleteActionHistory(id);
            alert('Запись физически удалена.');
            onClose();
            window.location.reload();
        } catch (error) {
            alert('Ошибка при физическом удалении.');
        }
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Полное удаление</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <p>Это физическое удаление. Восстановить будет невозможно. Продолжить?</p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
                        <button type="button" className="btn btn-danger" onClick={handlePurge}>Удалить навсегда</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoryPurge;