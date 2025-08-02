
import { useState, useEffect } from 'react';
import { getActiveActionHistory, getDeletedActionHistory } from '../../services/api';

export const useActionHistory = (filters, page = 1, pageSize = 20, typeDelete =  "inoe" ) => {
  console.log("useActionHistory-type filters->", typeof filters);
  console.log("useActionHistory-type typeDelete->", typeof typeDelete);
  console.log("useActionHistory-typeDelete->", typeDelete);
  console.log("useActionHistory-typeDelete.typeDelete->", typeDelete.typeDelete);

  //const actualTypeDelete = typeDelete.typeDelete;
  const actualTypeDelete = typeDelete;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  // const typeDeleteRef = useRef(typeDelete);

    console.log("typeDelete2hh",actualTypeDelete==='hard')
    console.log("typeDelete2ss",actualTypeDelete==='soft')
  
  const fetchData = async () => {
      setLoading(true);
      try {
        const params = { ...filters, page, page_size: pageSize };
        console.log("params->", params);
        let response;
        if (actualTypeDelete === 'soft') {
          // response = await getActionHistory({ params });
          response = await getActiveActionHistory( params );
        }
        if (actualTypeDelete === 'hard') {
          response = await getDeletedActionHistory(params);
        }
        console.log("response->", response);
        // Предполагаем, что бэкенд возвращает { results: [...], count: total }
        setData(response.data.results || response.data);
        setTotal(response.data.count || response.data.length);
        setError(null);
      } catch (err) {
        setError('Не удалось загрузить историю действий');
        setData([]);
      } finally {
        setLoading(false);
      }
    };  

  useEffect(() => {    
    fetchData();
  }, [filters, page, pageSize, typeDelete]);

  console.log("read data pag")

    return { data, loading, error, total, pageSize, refetch: fetchData };
};;