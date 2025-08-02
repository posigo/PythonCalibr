import React, { useEffect, useState} from "react";
import { getAsutpInfo } from "../../services/api";

const InfoPageLoader = ({ onLoaded }) => {
  const [asutpData, setAsutpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAsutp = async () => {
      try {
        const response = await getAsutpInfo();
        if (response.status === 200 && response.data) {
          let parsedData;
          if (typeof response.data === 'string') {
            parsedData = JSON.parse(response.data);
          } else {
            parsedData = response.data;
          }
          setAsutpData(parsedData);
        } else {
          setError("Не удалось загрузить информацию об АСУТП: Некорректный ответ от сервера");
        }        
      } catch (err) {
        setError("Не удалось загрузить информацию об АСУТП.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAsutp();
  }, []);

  if (loading) {
    return (
      <div className="container mt-5 mb-5 py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
          <p className="mt-2">Загрузка данных...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mt-5 mb-5 py-5">
        <div className="alert alert-danger text-center" role="alert">
          {error}
        </div>
      </div>
    );
  }
  if (!asutpData) {
    return (
      <div className="container mt-5 mb-5 py-5">
        <div className="alert alert-info text-center" role="alert">
          Нет данных для отображения
        </div>
      </div>
    );
  }

  // Передаем данные через пропс `onLoaded`
  return onLoaded({ asutpData });
};

export default InfoPageLoader;