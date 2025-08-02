import React, { useEffect, useState} from "react";
import { getSecurityPolicy } from "../../services/api";

const SecurityPolicyLoader = ({ onLoaded }) => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const response = await getSecurityPolicy();
        if (response.status === 200 && response.data) {
          let parsedData;
          if (typeof response.data === 'string') {
            parsedData = JSON.parse(response.data);
          } else {
            parsedData = response.data;
          }
          setPolicy(parsedData);
        } else {
          setError("Не удалось загрузить политику безопасности: Некорректный ответ от сервера");
        }        
      } catch (err) {
        setError("Не удалось загрузить политику безопасности.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  if (loading) return <div className='container mb-5 pt-5 mb-5'><p className='mb-5 pt-5 mb-5'>Загрузка политики безопасности...</p></div>
  if (error) return <div className='container mb-5 pt-5 mb-5'><p className='mb-5 pt-5 mb-5' style={{ color: 'red' }}>{error}</p></div>;  

  // Передаем данные через пропс `onLoaded`
  return onLoaded({ policy });
};

export default SecurityPolicyLoader;