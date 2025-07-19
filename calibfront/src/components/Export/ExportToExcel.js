import React, { useEffect, useRef} from 'react';
// import ExcelJS from 'exceljs';
// import { saveAs } from 'file-saver';
import { exportCalculationTo } from '../../services/api';

const ExcelExportButton = ({ calculation, uncertainty }) => {
  const downloadLinkRef = useRef(null);

  // useEffect(() => {
  //   // Очистка при размонтировании компонента
  //   return () => {
  //     if (downloadLinkRef.current) {
  //       window.URL.revokeObjectURL(downloadLinkRef.current.href);
  //       document.body.removeChild(downloadLinkRef.current);
  //     }
  //   };
  // }, []);

  const handleExportTo = async () => {   
    try {
      if (downloadLinkRef.current) {
        window.URL.revokeObjectURL(downloadLinkRef.current.href);
        document.body.removeChild(downloadLinkRef.current);
        downloadLinkRef.current = null;
      }
      let params = {};
      if (uncertainty.value !== -9999.0) {
        params = {
          valueSubstance: uncertainty.valueSubstance.toFixed(1),
          numberMeasure: uncertainty.numberMeasure
        }
      }
      
      const response = await exportCalculationTo(calculation.id, 'xls', params)
      const now = new Date();
      const timestamp = now.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      .replace(/[^\d]/g, '')
      .replace(/(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})/, '$3$2$1_$4$5'); 
      const contentDisposition = response.headers['content-disposition'];                                                   
      let filename = `calculation_${calculation.ComponentName}_${timestamp}.xlsx`;
      console.log("filename->",filename)
      console.log("response->",response)
      console.log("contentDisposition->",contentDisposition)
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?;?/i);
        console.log("filenameMatch->",filenameMatch);
        console.log("filenameMatch->[1]",filenameMatch[1]);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      // Создаем и скачиваем файл
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      downloadLinkRef.current = link;
      link.click();
      link.remove();
      }
    catch(error) {
      console.error('Export failed:', error);
    }
    
  };

  return (
    <button 
      className="btn btn-success w-100 py-2"
      onClick={handleExportTo}
    >
      {/* <i className="bi bi-file-excel me-2"></i> */}
      <i className="bi bi-file-earmark-excel me-2"></i>
      Экспорт в Excel
    </button>
  );
};

export default ExcelExportButton;