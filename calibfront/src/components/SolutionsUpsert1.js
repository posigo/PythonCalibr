import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getCalcSolutions,
    updateCalcSolution,
    deleteCalcSolution
} from '../services/api';

const SolutionsUpsert1 = () => {
    // Получаем параметры из URL
    const { id, countDensities } = useParams();
    const navigate = useNavigate();

    // Состояние для хранения данных
    const [solutions, setSolutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const countDensitiesInt = parseInt(countDensities) || 0;
    console.log("SolutionsUpsert -- ountDensitiesInt = ", countDensitiesInt)
    // Загрузка данных при монтировании компонента
    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getCalcSolutions(id);
                //console.log("SolutionsUpsert");
                console.log("Data type:", Array.isArray(data)); // Должно быть true
                console.log("Data contents:", JSON.parse(JSON.stringify(data))); // Чистый вывод без "заморозки"
                const dataArray = Array.isArray(data) ? data : [data];
                setSolutions(dataArray);
                console.log("SolutionUpsert -- data: ", dataArray)
                setLoading(false);
                console.log("SolutionUpsert -- sls: ", solutions )
            }
            catch(error) {
                setError(error.message);
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

    // Отдельный эффект для логирования обновлений solutions
    //useEffect(() => {
    //    console.log("Updated solutions: ", solutions);
    //}, [solutions]);

    // Обработчик изменения значения раствора
    const handleSolutionChange = (solutionIndex, value) => {
        const updatedSolutions = [...solutions];
        updatedSolutions[solutionIndex].Value = parseFloat(value) || 0;
        setSolutions(updatedSolutions);
    };

    // Обработчик изменения оптической плотности
    const handleOpticalDensityChange = (solutionIndex, odIndex, value) => {
        const updatedSolutions = [...solutions];
        updatedSolutions[solutionIndex].optical_densities[odIndex].Value = parseFloat(value) || 0;
        setSolutions(updatedSolutions);
    };

    // Обновление раствора и его оптических плотностей
    const handleUpdate = async (solutionIndex) => {
        try {
            const solution = solutions[solutionIndex];
            await updateCalcSolution(
                solution.id,
                { Value: solution.Value },
                solution.optical_densities
            );
            alert('Данные успешно обновлены!');
        } catch (err) {
            alert('Ошибка при обновлении: ' + err.message);
        }
    };

    // Удаление раствора
    const handleDelete = async (solutionIndex) => {
        if (window.confirm('Вы уверены, что хотите удалить этот раствор?')) {
            try {
                await deleteCalcSolution(solutions[solutionIndex].id);
                const updatedSolutions = solutions.filter((_, index) => index !== solutionIndex);
                setSolutions(updatedSolutions);
                alert('Раствор успешно удален!');
            } catch (err) {
                alert('Ошибка при удалении: ' + err.message);
            }
        }
    };


    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>Ошибка: {error}</div>;

    return (
        <div className="container mt-4">
            <h2>Растворы расчёта с id = {id}</h2>
            {/*console.log("SolutionsUpsert -- solution: ",solutions)*/}
            <table>
                <thead>
                    <tr>
                        <th>Значение растворов</th>
                        {/* Заголовки для оптических плотностей */}
                        {[...Array(parseInt(countDensitiesInt))].map((_,i) => (
                           <th key={i}>ОптПлотн {i +1}</th>
                        ))}
                        <th>Обновить</th>
                        <th>Удалить </th>
                    </tr>
                </thead>
                <tbody>
                    {solutions.map((solutions, solIndex) => {
                        console.log("ssssssddddd -- ", solutions[solIndex])
                    })}
                    {/*    <tr>
                            <td>
                                <input
                                    type="number"
                                    className="form-control"
                                    onChange={(e) => handleSolutionChange(solIndex, e.target.value)}
                                    step="0.01"
                                />
                            </td>*/}
                            {/* Поля оптических плотностей */}
                            {/*{solution.optical_densities.map((od, odIndex) => (
                                <td key={od.id}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={od.Value}
                                        onChange={(e) => handleOpticalDensityChange(solIndex, odIndex, e.target.value)}
                                        step="0.01"
                                    />
                                </td>
                            ))}*/}

                            {/* Кнопка обновления */}
                            {/*<td>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleUpdate(solIndex)}
                                >
                                    Обновить
                                </button>
                            </td>*/}

                            {/* Кнопка удаления */}
                            {/*<td>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDelete(solIndex)}
                                >
                                    Удалить
                                </button>
                            </td>
                        </tr>
                    })} */}
                </tbody>
            </table>
        </div>
    )

}

export default SolutionsUpsert1;