import React from "react";
import { Link } from 'react-router-dom';
import { getHelpCalibrationPDF } from "../../services/api";
import { toast } from "react-toastify";

const DownloadHelpPDF2 = () => {
  
  const handleDownload = async (e) => {
    e.preventDefault();
    try {
      const response = await getHelpCalibrationPDF();
      console.log("DownloadHelpPDF-response->", response);
       // Получаем данные ответа
      const disposition = response.headers['content-disposition'];
      console.log("DownloadHelpPDF-disposition->", disposition);
      console.log("DownloadHelpPDF-disposition->", disposition.indexOf('filename='));
      console.log("DownloadHelpPDF-disposition->", disposition.indexOf('filename*=UTF-8') !== -1);
      let filename = 'CalcCalibrHelp.pdf'; // значение по умолчанию
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename="?([^"]+)"?/.exec(disposition);
        console.log("DownloadHelpPDF-matches->", matches);
        if (matches.length > 1) {
          filename = matches[1];
        }
      }
      // Декодируем UTF-8 если есть filename*
      if (disposition && disposition.indexOf('filename*=UTF-8') !== -1) {
        const utf8Match = /filename\*=UTF-8''([\w%\-\.]+)/i.exec(disposition);
        console.log("DownloadHelpPDF-matches->", utf8Match);
        if (utf8Match && utf8Match[1]) {
          filename = decodeURIComponent(utf8Match[1]);
        }
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });  // ранения бинарных данных в JavaScript.
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("DownloadHelpPDF-response-Ошибка скачивания файла->", error);
      console.error("DownloadHelpPDF-response-Ошибка скачивания файла->", error.response?.data || error.message);
      if (error.status === 401) {
        toast.error("У вас нет доступа. Необходимо авторизироваться");
      } else {
        toast.error("Не удалось скачать файл помощи");                                        
      }
    }
  }
  return (
    <Link to="#" onClick={handleDownload}>Помощь</Link>
  )
}

export default DownloadHelpPDF2;