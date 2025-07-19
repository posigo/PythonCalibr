import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const SolutionsUpsert = () => {
  // Получаем параметры из URL
  const { id, countDensities } = useParams();
  const navigate = useNavigate();

 console.log('su: ' + id + " | " + countDensities)
 {console.log([...Array((countDensities))]);}


  // Валидация параметра
  const countDensities1 = () => {
    return Math.max(0, parseInt(countDensities) || 0);
  }

console.log(countDensities)

  // Состояния компонента
  const [solutions, setSolutions] = useState([]);
  const [opticalDensities, setOpticalDensities] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [newSolution, setNewSolution] = useState({
    value: '',
    densities: Array(countDensities).fill('')
  });
  const [loading, setLoading] = useState(true);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Загружаем растворы для текущего расчета
        const solutionsRes = await axios.get(`/api/solutions?calculation_id=${id}`);
        setSolutions(solutionsRes.data);

        // Загружаем оптические плотности для каждого раствора
        const densitiesMap = {};
        for (const solution of solutionsRes.data) {
          const densitiesRes = await axios.get(`/api/optical-densities?solution_id=${solution.id}`);
          densitiesMap[solution.id] = densitiesRes.data;
        }
        setOpticalDensities(densitiesMap);

      } catch (error) {
        toast.error('Ошибка при загрузке данных');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Обработчик изменения значений в модальном окне
  const handleModalChange = (e, index) => {
    if (index === undefined) {
      setNewSolution({...newSolution, value: e.target.value});
    } else {
      const newDensities = [...newSolution.densities];
      newDensities[index] = e.target.value;
      setNewSolution({...newSolution, densities: newDensities});
    }
  };

  // Добавление нового раствора и оптических плотностей
  const handleAddSolution = async () => {
    try {
      // 1. Создаем новый раствор
      const solutionRes = await axios.post('/api/solutions', {
        calculation_id: id,
        CountDensitie: countDensities,
        value: newSolution.value
      });

      // 2. Создаем оптические плотности для этого раствора
      const densitiesPromises = newSolution.densities.map(value =>
        axios.post('/api/optical-densities', {
          solution_id: solutionRes.data.id,
          value
        })
      );

      await Promise.all(densitiesPromises);

      // 3. Обновляем UI
      toast.success('Данные успешно добавлены');
      setShowModal(false);
      setNewSolution({
        value: '',
        densities: Array((countDensities)).fill('')
      });

      // Перезагружаем данные
      const solutionsRes = await axios.get(`/api/solutions?calculation_id=${id}`);
      setSolutions(solutionsRes.data);

      const newDensitiesRes = await axios.get(`/api/optical-densities?solution_id=${solutionRes.data.id}`);
      setOpticalDensities(prev => ({
        ...prev,
        [solutionRes.data.id]: newDensitiesRes.data
      }));

    } catch (error) {
      toast.error('Ошибка при добавлении данных');
      console.error(error);
    }
  };

  // Обновление раствора
  const handleUpdateSolution = async (solutionId, newValue) => {
    try {
      await axios.put(`/api/solutions/${solutionId}`, { value: newValue });
      setSolutions(solutions.map(s =>
        s.id === solutionId ? {...s, value: newValue} : s
      ));
      toast.success('Раствор обновлен');
    } catch (error) {
      toast.error('Ошибка при обновлении раствора');
      console.error(error);
    }
  };

  // Обновление оптической плотности
  const handleUpdateDensity = async (densityId, solutionId, index, newValue) => {
    try {
      await axios.put(`/api/optical-densities/${densityId}`, { value: newValue });

      setOpticalDensities(prev => {
        const updated = [...prev[solutionId]];
        updated[index] = {...updated[index], value: newValue};
        return {...prev, [solutionId]: updated};
      });

      toast.success('Плотность обновлена');
    } catch (error) {
      toast.error('Ошибка при обновлении плотности');
      console.error(error);
    }
  };

  // Удаление раствора и связанных плотностей
  const handleDeleteSolution = async (solutionId) => {
    if (!window.confirm('Удалить этот раствор и все связанные данные?')) return;

    try {
      await axios.delete(`/api/optical-densities?solution_id=${solutionId}`);
      await axios.delete(`/api/solutions/${solutionId}`);

      setSolutions(solutions.filter(s => s.id !== solutionId));
      setOpticalDensities(prev => {
        const newState = {...prev};
        delete newState[solutionId];
        return newState;
      });

      toast.success('Данные удалены');
    } catch (error) {
      toast.error('Ошибка при удалении');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Загрузка данных...</div>;
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Растворы расчёта с id={id}</h2>

      {/* Основная таблица */}
      {/*<h1>{countDensities}</h1>*/}
      <div className="table-responsive">
        <table className="table table-striped table-bordered table-hover">
          <thead className="thead-dark">
            <tr>
              <th>Значение раствора</th>
              {[...Array((countDensities))].map((_, i) => (
                <th key={`density-${i}`}>Опт. плотность {i+1}</th>
              ))}
              <th colSpan="2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {solutions.map(solution => (
              <tr key={solution.id}>
                <td>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={solution.value}
                    onChange={(e) => handleUpdateSolution(solution.id, e.target.value)}
                  />
                </td>

                {opticalDensities[solution.id]?.map((density, index) => (
                  <td key={`${solution.id}-${density.id}`}>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={density.value}
                      onChange={(e) =>
                        handleUpdateDensity(density.id, solution.id, index, e.target.value)
                      }
                    />
                  </td>
                ))}

                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleUpdateSolution(solution.id, solution.value)}
                  >
                    Обновить
                  </button>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDeleteSolution(solution.id)}
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}

            <tr>
              <td colSpan={parseInt(countDensities) + 3}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => setShowModal(true)}
                >
                  Добавить раствор
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Модальное окно для добавления нового раствора */}
      {showModal && (
        <div className="modal show" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Добавить новый раствор</h5>
                <button
                  type="button"
                  className="close"
                  onClick={() => setShowModal(false)}
                >
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Значение раствора:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newSolution.value}
                    onChange={(e) => handleModalChange(e)}
                  />
                </div>

                {newSolution.densities.map((density, index) => (
                  <div className="form-group" key={`modal-density-${index}`}>
                    <label>Оптическая плотность {index + 1}:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={density}
                      onChange={(e) => handleModalChange(e, index)}
                    />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddSolution}
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Затемнение фона при открытом модальном окне */}
      {showModal && <div className="modal-backdrop show"></div>}

      {/* Навигационные кнопки */}
      <div className="mt-4 d-flex justify-content-between">
        <button
          className="btn btn-outline-primary"
          onClick={() => navigate('/calculations')}
        >
          К списку расчётов
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(`/calculations/${id}/data`)}
        >
          К данным расчёта
        </button>
        <button
          className="btn btn-outline-info"
          onClick={() => navigate(`/calculations/${id}/details`)}
        >
          К деталям расчёта
        </button>
      </div>
    </div>
  );
};

export default SolutionsUpsert;