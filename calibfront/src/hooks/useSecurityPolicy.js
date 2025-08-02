import { useEffect, useState } from "react";
import { getSecurityPolicy } from '../services/api'

export const useSecurityPolicy = () => {
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
          setError("Не удалось загрузить политику безопасности: Некорректный ответ от сервера")
        }        
      } catch (err) {
        setError("Не удалось загрузить политику безопасности.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPolicy();
  }, []);

  return { policy, loading, error };
}