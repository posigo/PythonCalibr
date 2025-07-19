import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { createSolution, createOpticalDensity } from '../services/api'

const AddSolutionModal = ({
    isShow,             // Показать окно
    calculationId,      // ИД расчёта
    densitiesCount,     // Количество плотностей в растворе
    onCloseModal,       // Обработчик скрыть окно
    onAddSuccess       // Обработчик обновления растворов после добавления
}) => {
    // Состояние для данных нового раствора
    const [newSolution2, setNewSolution2] = useState({
        Value: 1.000,
        opticalDensities: Array(densitiesCount).fill('0.000')
    });
    const [resultSolAdd, setResultSolAdd] = useState(true);  // Результат добавления раствора с оптическими плотностями    

    // console.log('isShow: ', isShow);
    // console.log('calculationId: ', calculationId);
    // console.log('densitiesCount:', densitiesCount);
    // console.log('onCloseModal: ', onCloseModal);
    // console.log('onAddSuccess: ', onAddSuccess);
    // console.log('resultSolAdd', resultSolAdd);

    // Обработчик изменения значения раствора
    const handleNewSolutionValueChange = (e) => {
        const value = e.target.value;
        if (value && parseFloat(value) !==0) {
            setNewSolution2(
                prev => (
                    {...prev, Value: value}));
        };
    };

    // Обработчик изменения значения плотности раствора
    const handleNewDensityChange = (e, index) => {
        //console.log('e-density: ', e);
        const value = e.target.value;
        setNewSolution2(prev => {
            const newDensities = [...prev.opticalDensities];
            newDensities[index] = value;
            return {
                ...prev,
                opticalDensities: newDensities
            };
        });
    };
    //console.log('newSolution2-density: ', newSolution2);

    //Добавлеине нового раствора
    const handleAddNewSolution = async () => {
        try {
            const responseAddSol = await  createSolution({
                'Calculation': calculationId,
                'CountDensities': densitiesCount,
                'Value': parseFloat(newSolution2.Value) || 0
            }) 
            // console.log('Добавление раствора. Полный ответ сервера:', {
            //     status: responseAddSol.status,
            //     headers: responseAddSol.headers,
            //     data: responseAddSol.data,
            //     config: responseAddSol.config
            // });
            if (responseAddSol.status === 201 || responseAddSol.status === 200) {
                const responseAddODs = await Promise.all(
                    newSolution2.opticalDensities
                        .map((value, idx) => 
                            createOpticalDensity({
                                'Solution': responseAddSol.data.id,
                                'Value': parseFloat(value) || 0
                            }))
                )
                responseAddODs.forEach(result => {
                    console.log('Добавление оптической плотности в раствор. Полный ответ сервера:', {
                        status: result.status,
                        headers: result.headers,
                        data: result.data,
                        config: result.config
                    });
                    if (result.status === 201 || result.status === 200) {
                        console.log('Добавление ОптПлотн успешно: ', result.status);                        
                    } else {
                        console.error('Добавление ОптПлотн ошибка: ', result.status);
                        //console.error('Обновление ОптПлотн ошибка: ', result.reason);
                        toast.error('Добавление опт плотн ошибка, от сервера пришёл ошибочный статус: ' + result.status)                        
                        setResultSolAdd(false);
                    }
                })
                //console.log('resultSolAdd: ', resultSolAdd);
                if (resultSolAdd) {
                    onAddSuccess();                
                }
            }
            else {
                console.error('Ощибка при добавлении нового раствора, статус: ', responseAddSol.status);
                toast.error('Ощибка при добавлении нового раствора');
                setResultSolAdd(false);
            }                
        }
        catch (err){
            console.error("Обработчик добавления нового раствора, ошибка: ", err);
            toast.error('Обработчик добавления нового раствора, ошибка');
            setResultSolAdd(false);
        }
        finally {
            onCloseModal();
        }
    }

    if (!isShow) return null;
    return (
        <>
        {/* Модальное окно (используем Bootstrap классы) */}
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              {/* Заголовок модального окна */}
              <div className="modal-header bg-success text-black">
                <h5 className="modal-title">
                  <i class="bi bi-plus-circle me-1"></i>
                  <i class="bi bi-droplet-half me-2"></i>
                  Добавление раствора (для расчёта с ИД = {calculationId})
                </h5>
                <button
                  type="button"
                  className="btn-close text-danger text-end"
                  onClick={onCloseModal}
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              {/* Тело модального окна */}
              <div className="modal-body">
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="thead-light">
                      <tr>
                        <th>Значение раствора</th>
                        {Array.from({ length: densitiesCount }).map((_, i) => (
                          <th key={`density-header-${i}`}>Опт. плотность {i+1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {/* Поле для значения раствора */}
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            value={newSolution2.Value}
                            onChange={handleNewSolutionValueChange}
                            step="0.1"
                            min="0"
                          />
                        </td>
                        {/* Поля для оптических плотностей */}
                        {newSolution2.opticalDensities.map((density, index) => (
                          <td key={`density-input-${index}`}>
                            <input
                              type="number"
                                className="form-control"
                                value={density}
                                onChange={(e) => {
                                                        // console.log('newSolution2-density: ', newSolution2);
                                                        // console.log('e-density: ', e);
                                                        // console.log('index-density: ', index);
                                        // console.log('value-density: ', density);
                                  handleNewDensityChange(e, index)
                                }}
                                step="0.001"
                                min="0"
                            />
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Футер модального окна с кнопками */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onCloseModal}
                >
                  <i class="bi bi-x-circle me-2"></i>
                  Отменить
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleAddNewSolution}
                >
                  <i class="bi bi-check-circle me-2"></i>
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
    )
};

export default AddSolutionModal;