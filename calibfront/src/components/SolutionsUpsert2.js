import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSolutionsByCalculation, updateSolution, deleteSolution, updateOpticalDensity, getCalculation }from '../services/api'
import { toast } from 'react-toastify';
import AddSolutionModal from './AddSolutionModal'

const SolutionsUpsert2 = () => {
    // Получаем параметры из URL
    const { id, countDensities } = useParams();
                
    //console.log("id: ", id);
    //console.log("сountDensities: ", countDensities);

    // Хук для навигации
    const navigate = useNavigate();

    // Состояния компонента
    const [error, setError] = useState(null); // Для хранения ошибок    
    const [toastError, setToastError] = useState(null); // Добавляем состояние для toast
    const [toastSuccess, setToastSuccess] = useState(null); // Cостояние для сообщений toast
    const [calculation, setCalculation] = useState(null); // Данные расчета
    const [solutions, setSolutions] = useState([]); // Список растворов
    const [isLoading, setIsLoading] = useState(true); // Флаг загрузки
    const [calculationId, setCalculationId] = useState(NaN); // id расчёта
    const [densitiesCount, setDensitiesCount] = useState(NaN);  // Количество оптических плотностей в каждом растворе
    const [showModalAdd, setShowModalAdd] = useState(false);  // Отображение модального окна              
    
    const isInitialMount = useRef(true);
    const isInitialMountSuccess = useRef(true);
    //const parseCount = parseInt(countDensities);

    // Для toast Error
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (toastError) {
            toast.error(toastError);
            setToastError(null);
        }
    }, [toastError]);

    // Для toast Succes
    useEffect(() => {
        if (isInitialMountSuccess.current) {
            isInitialMountSuccess.current = false;
            return;
        }
        if (toastSuccess) {
            toast.success(toastSuccess);
            setToastSuccess(null);
        }
    }, [toastSuccess]);

    // Чтение растворов при изменении id, countDensities
    useEffect(() => {
        // Валидация параметров
        const parseId = parseInt(id);
        const parseCount = parseInt(countDensities);
        if (isNaN(parseId) || isNaN(parseCount)) {
            setError('Ошибка: невозможно получить информацию о растворах, неверные переданные параметры');
            setToastError('Ошибка: невозможно получить информацию о растворах, неверные переданные параметры');
            setIsLoading(false)
            //toast.error('Невозможно получить информацию о растворах: неверные параметры')
            //return;
        }
        else {
            //Проверяем, что parseCount — число > 0
            if (parseCount <= 0) {
                console.error('sss');
                setError('Ошибка: (' + parseCount.toString() + ') неверное количество плотностей' );
                setToastError('Ошибка: (' + parseCount.toString() + ') неверное количество плотностей' );
                setIsLoading(false);
            }
            else {
                setCalculationId(parseId);
                setDensitiesCount(parseCount);
                // Функция загрузки данных
                const fetchData = async () => {
                    try {
                        // Альтернативные подходы к загрузке данных:
                        // 1. Загрузка только растворов
                        const solutionsResponse = await getSolutionsByCalculation (parseId);
                        // 2. Загрузка всего расчета с включенными растворами (опционально)
                        const calculationResponse = await getCalculation(parseId);
                        setCalculation(calculationResponse.data);
                        // Используем растворы либо из первого запроса, либо из расчета       
                        setSolutions(solutionsResponse.data.length > 0 ? solutionsResponse.data : calculationResponse.data.calculation_solutions);
                    }
                    catch(err) {
                        setError('Ошибка при загрузке данных с сервера');
                        setToastError('Ошибка при загрузке данных с сервера');
                        //toast.error('Ошибка при загрузке данных с сервера')
                        console.error('Ошибка при загрузке данных с сервера: ', err);
                    }
                    finally {
                        setIsLoading(false)
                    }
                }
                fetchData();
            }
        }        
    }, [id, countDensities]);

    // Обновление растворов после добавления
    // const handleAddSuccess =  useCallback(async () => {
    //     try {
    //         const { data } = await getSolutionsByCalculation(calculationId);
    //         setSolutions(data);
    //     }
    //     catch(err) {
    //         console.error('zzzzzz: ', err)
    //     }
    // }, [calculationId]);
    
    // Если загрузка
    if (isLoading) {
        return (
            <div className='container-fluid'>
                <div className='container mt-4 allert alert-primary'>Загрузка...</div>
            </div>
        )
    }

    // Если ошибка
    if (error) {
        //toast.error(error);
        return (
            <div className='container-fluid'>
                <div className='container mt-4 alert alert-danger'>{error}</div>
            </div>
        )
        //return;
    }

    // Если нет данных
    if ((!calculation || !solutions) && error===null) {
        setToastError.error('Данные не найдены');
        return (
            <div className='container-fluid'>
                <div className='container mt-4 alert alert-danger'>Данные не найдены</div>
            </div>
        )
    }
    // else {
    //     return (
    //         <div className='container-fluid'>
    //             <div className='container mt-4 alert alert-success'>Данные считаны</div>
    //         </div>
    //     )
    // }

    // Обработчик изменения значения раствора
    const handleSolutionValueChange = (index, value) => {
        const updatedSolutions = [...solutions];
        updatedSolutions[index].Value = parseFloat(value) || 0;
        setSolutions(updatedSolutions);
    };

    // Обработчик изменения оптической плотности
    const handleOpticalDensityChange = (solutionIndex, densityIndex, value) => {
        const updatedSolutions = [...solutions];

        // Проверяем, существует ли раствор по указанному индексу
        if (!updatedSolutions[solutionIndex]) {
            console.error('Раствор с индексом', solutionIndex, 'не найден');
            return;
        }

        // Инициализируем массив оптических плотностей, если его нет
        // if (!updatedSolutions[solutionIndex].solution_optical_densities) {
        //     updatedSolutions[solutionIndex].solution_optical_densities = [];
        // }

        // console.log("solutions:", solutions);
        // console.log("updatedSolutions: ", updatedSolutions);
        // console.log("updatedSolutions[solutionIndex]: ", updatedSolutions[solutionIndex]);
        // console.log("updatedSolutions[solutionIndex].solution_optical_densities: ", updatedSolutions[solutionIndex].solution_optical_densities);
        // console.log("updatedSolutions[solutionIndex].solution_optical_densities[densityIndex]: ",
        //     updatedSolutions[solutionIndex].solution_optical_densities[densityIndex]);
        // console.log("updatedSolutions[solutionIndex].solution_optical_densities[densityIndex].Value: ",
        //     updatedSolutions[solutionIndex].solution_optical_densities[densityIndex].Value);

        // if (!updatedSolutions[solutionIndex].solution_optical_densities) {
        //     updatedSolutions[solutionIndex].solution_optical_densities = [];
        // }

        updatedSolutions[solutionIndex].solution_optical_densities[densityIndex].Value = parseFloat(value) || 0;
        setSolutions(updatedSolutions);
        // console.log("solutions[solutionIndex].solution_optical_densities[densityIndex].Value: ",
        //    solutions[solutionIndex].solution_optical_densities[densityIndex].Value);
    };

    // Обработчик кнопки обновить
    const handleUpdateSolution = async (solutionId) => {
        try {
            //console.log("solutions: ", solutions);
            const updSol = solutions.find(s => s.id === solutionId);
            //console.log("solutionId: ", solutionId);
            //console.log("updSol: ", updSol)
            const responseUpdSol = await updateSolution(solutionId, {
                'Value': updSol.Value,
                'countDensities': updSol.CountDensities,
                'Calculation': updSol.Calculation
            })
            console.log('Обновление раствора. Полный ответ сервера:', {
                status: responseUpdSol.status,
                headers: responseUpdSol.headers,
                data: responseUpdSol.data,
                config: responseUpdSol.config
            });
            if (responseUpdSol.status === 200 || responseUpdSol.status === 204) {
                console.log('Обновление раствора, от сервера пришёл статус: ', responseUpdSol.status);
            } 
            else {
                console.error('Обновление раствора ошибка, от сервера пришёл статус: ', responseUpdSol.status);
                setToastError('Обновление раствора ошибка, от сервера пришёл статус: ' + responseUpdSol.status);
                return;
            }

            //console.log("updSol.solution_optical_densities: ", updSol.solution_optical_densities)
            const updODs = updSol.solution_optical_densities;
            //console.log("updODs: ", updODs)
            if (updSol.solution_optical_densities?.length > 0) {
                const resUpdOD = await Promise.all(
                    updSol.solution_optical_densities.map(od => 
                        updateOpticalDensity(od.id, {
                            'Value': od.Value,
                            'Solution': od.Solution
                        })
                    )
                );
                console.log('resUpdOD: ', resUpdOD);

                resUpdOD.forEach(result => {
                    console.log('resUpdOD.result.status: ', result.status);
                    console.log('Обновление оптической плотности. Полный ответ сервера:', {
                        status: result.status,
                        headers: result.headers,
                        data: result.data,
                        config: result.config
                    });
                    if (result.status === 200 || result.status === 204) {
                        console.log('Обновление ОптПлотн успешно: ', result.status);
                    } else {
                        console.error('Обновление ОптПлотн ошибка: ', result.status);
                        //console.error('Обновление ОптПлотн ошибка: ', result.reason);
                        setToastError('Обновление опт плотн ошибка, от сервера пришёл ошибочный статус: ' + result.status);
                        return;
                    }
                })
                // Последовательное обновление 
                /* for (const odd of updSol.solution_optical_densities) {
                    await updateOpticalDensity(od.id, {
                        Value: od.Value,
                        Solution: od.Solution
                }); */             
            }
            else {
                setToastError('Ошибка при обновлении оптических плотностей: массив плотностей нулевой');
                return;
            }                     

            setToastSuccess('Данные раствора успешно обновлены!');
        }
        catch (err) {
            // Обработка разных типов ошибок
            if (err.response) {
                // Сервер ответил с ошибкой (4xx, 5xx)
                console.error('HTTP error:', error.response.status);
                setToastError(err.response.data?.message || 'Ошибка сервера');
            }
            else if (err.request) {
                // Запрос был сделан, но ответа нет
                console.error('No response:', err.request);
                setToastError('Сервер не ответил');
            }
            else {
                // Ошибка настройки запроса
                console.error('Request error:', err.message);
                setToastError('Ошибка при отправке запроса');
            }
            //return false;
            //console.error('Ошибка при обновлении раствора: ', err);
            setToastError('Ошибка при обновлении раствора: '+ err)
        }
    };

    // Обработчик удаления раствора
    const handleDeleteSolution = async (solutionId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот раствор?')) {
            try {                
                const responseDel = await deleteSolution(solutionId);
                if (responseDel.status === 200 || responseDel.status === 204) {
                    setSolutions(solutions.filter(s => s.id !== solutionId));
                    setToastSuccess('Раствор успешно удален! (' + responseDel.status + ')');
                }
                else {
                    console.error('При удалении раствора от сервера пришёл неожиданный статус ответа: ', responseDel.status);
                    setToastError('При удалении раствора от сервера пришёл неожиданный статус ответа: ' + responseDel.status);
                }
            } catch (err) {
                // Обработка разных типов ошибок
            if (err.response) {
                // Сервер ответил с ошибкой (4xx, 5xx)
                console.error('HTTP error:', error.response.status);
                setToastError(err.response.data?.message || 'Ошибка сервера');
            }
            else if (err.request) {
                // Запрос был сделан, но ответа нет
                console.error('No response:', err.request);
                setToastError('Сервер не ответил');
            }
            else {
                // Ошибка настройки запроса
                console.error('Request error:', err.message);
                setToastError('Оибка при отправке запроса');
            }
                //console.error('Ошибка при удалении раствора: ', err);
                setToastError('Ошибка при удалении раствора: ' + err)
            }
        }        
    };
    
    // Обработчик обновления растворов после добавления
    const handleAddSuccess =  async () => {
        try {
            //console.log('resultSolAdd: ', resultSolAdd)
            //if (resultSolAdd) {
                const { data } = await getSolutionsByCalculation(calculationId);
                setSolutions(data);
                setToastSuccess('Добален новый раствор!');                
            //}            
        }
        catch(err) {
            console.error('При обновлении растворов произошла ошибка: ', err);
            setToastError('При обновлении растворов произошла ошибка: ')
        }
    };

    return (
        <div className='container-fluid mt-5 pt-3'>
            <div className='row d-flex mb-5'>
                <div className='col col-1'></div>
                <div className='col col-10'>
                    <h2 className='text-primary'>
                        <i class="bi bi-droplet-half me-2"></i>
                        Растворы расчёта с ИД = {calculationId}
                    </h2>
                    <table className='table table-bordered'>
                        <thead>
                            <tr>
                                <th>Значение раствора</th>
                                {Array.from({length: densitiesCount})
                                    .map((_, i) => (
                                        <th key={i}>Опт. плотность {i+1}</th>
                                    )
                                )}
                                <th colSpan={2}>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {solutions.map((solution, solIndex) => 
                                <tr key={solution.id}>
                                    {/* Значение раствора */}
                                    <td>
                                        <input
                                            type='number'
                                            className='form-control'
                                            value={solution.Value}
                                            step='0.1'
                                            onChange={(e) => handleSolutionValueChange(solIndex, e.target.value)}
                                        />
                                    </td>
                                    {/* Оптические плотности */}                                    
                                    {(solution.CountDensities === densitiesCount) ? (
                                        <>
                                        {Array.from({length: densitiesCount})
                                            .map((_, denIndex) => (
                                                <td key={denIndex}>
                                                    <input
                                                        type="number"
                                                        className='form-control'
                                                        value={solution.solution_optical_densities?.[denIndex]?.Value || 0}
                                                        step='0.001'
                                                        onChange={(e) => {handleOpticalDensityChange(solIndex, denIndex, e.target.value)}}
                                                    />
                                                </td>
                                            ))
                                        }                                        
                                        {/* Кнопки действий */}
                                        <td>
                                            <button
                                                className='btn btn-primary'
                                                onClick={() => {
                                                    //console.log("solIndex: ", solIndex);
                                                    //console.log("solution-btn: ", solution);
                                                    //console.log("solution.id: ", solution.id);
                                                    handleUpdateSolution(solution.id)
                                                }}
                                            >
                                                <i class="bi bi-arrow-repeat me-2"></i>
                                                Обновить
                                            </button>
                                        </td>
                                        <td>
                                            <button
                                                className='btn btn-danger'
                                                onClick={() => {handleDeleteSolution(solution.id)}}
                                            >
                                                <i class="bi bi-trash me-2"></i>                                             
                                                Удалить
                                            </button>
                                        </td>
                                        </>                                        
                                    ) : (
                                        <>
                                        <td colSpan={densitiesCount+2} className='text-danger'>
                                            FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
                                        </td>
                                        </>
                                    )}
                                </tr>
                            )}
                            <tr>
                                <td colSpan={densitiesCount+3}>
                                    <button
                                        className="btn btn-success w-100"
                                        onClick={() => {setShowModalAdd(true)}}
                                    >
                                        <i class="bi bi-plus-circle me-2"></i>
                                        Добавить
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <AddSolutionModal
                        isShow={showModalAdd}
                        calculationId={calculationId}
                        densitiesCount={densitiesCount} 
                        onCloseModal={() => {setShowModalAdd(false)}}
                        onAddSuccess={()=>{handleAddSuccess()}}                        
                    />
                    {/* console.log('showModalAdd: ', showModalAdd) */}
                    {/* Затемнение фона при открытом модальном окне */}
                    {showModalAdd && <div className="modal-backdrop show"></div>}
                </div>
                <div className='col col-1'>
                     {/* Навигационные кнопки */}
                    <div className="mt-4 sticky-top align-self-start bg-light d-flex flex-column gap-2">
                        <button
                            className="btn btn-secondary w-100 py-2"
                            onClick={() => navigate('/calculations')}
                        >
                            <i class="bi bi-list-columns me-2"></i>
                            К списку расчётов
                        </button>
                        <button
                            className="btn btn-primary w-100 py-2"
                            onClick={() => navigate(`/calculations/${calculationId}/edit`)}
                        >
                            <i class="bi bi-file-text me-2"></i>
                            К данным расчёта
                        </button>
                        <button
                            className="btn btn-success w-100 py-2"
                            onClick={() => navigate(`/calculations/${id}`)}
                        >
                            <i class="bi bi-graph-up me-2"></i>
                            К деталям расчёта
                        </button>
                    </div>
                </div>
            </div>            
        </div>
    )
};

export default SolutionsUpsert2;