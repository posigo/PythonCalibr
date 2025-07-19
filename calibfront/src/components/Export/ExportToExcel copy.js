// ExcelExportButton.js
import React from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ExcelExportButton = ({ calculation, uncertainty }) => {
  const exportToExcel = () => {
    // Создаем новую рабочую книгу
    const wb = XLSX.utils.book_new();
    
    // Подготовка данных для экспорта
    const exportData = [];
    
    // 1. Добавляем заголовок
    exportData.push(['Детали расчёта']);
    exportData.push([]);
    
    // 2. Добавляем информацию о расчете
    exportData.push(['Компонент:', calculation.ComponentName]);
    exportData.push(['Предел верхней концентрации:', calculation.UpLimitConcSubstance]);
    exportData.push(['Дата расчёта:', 
      new Date(calculation.DateTime).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      })
    ]);
    exportData.push(['Прибор:', calculation.Device]);
    exportData.push(['Метод:', calculation.SolutionBasic]);
    exportData.push(['Базовый раствор:', calculation.BasicSolution]);
    exportData.push(['Рабочий раствор:', calculation.SolutionWorking]);
    exportData.push(['Длина волны:', calculation.Walvelength]);
    exportData.push(['Кювета:', calculation.UpLimitConcSubstance]);
    exportData.push([]);
    
    // 3. Добавляем таблицу растворов (без деталей)
    if (calculation.calculation_solutions && calculation.calculation_solutions.length > 0) {
      exportData.push(['Таблица растворов']);
      
      // Заголовки таблицы
      const headers = ['Значение'];
      for (let i = 0; i < calculation.CountDensities; i++) {
        headers.push(`ОптПлотн${i+1}`);
      }
      headers.push('Абсолютная погрешность', 'Относительная погрешность', 'Complete Measurement Result');
      exportData.push(headers);
      
      // Данные таблицы
      calculation.calculation_solutions.forEach(solution => {
        const row = [solution.Value];
        solution.solution_optical_densities.forEach(od => {
          row.push(od.Value.toFixed(3));
        });
        row.push(
          solution.error_absolute_optical_density.toFixed(6),
          solution.error_relative_optical_density.toFixed(6),
          solution.complete_measurement_result
        );
        exportData.push(row);
      });
      
      exportData.push([]);
    }
    
    // 4. Добавляем результат расчета
    exportData.push(['Результат:', calculation.Y_String]);
    exportData.push([]);
    
    // 5. Добавляем неопределенность, если она есть
    if (uncertainty.value !== -9999.0) {
      exportData.push(['Неопределённость линейной градуировки']);
      exportData.push(['при значении вещества:', uncertainty.valueSubstance.toFixed(1)]);
      exportData.push(['при количестве измерений:', uncertainty.numberMeasure]);
      exportData.push(['неопределённость равна:', uncertainty.value.toFixed(1)]);
      exportData.push([]);
    }
    
    // 6. Добавляем данные для графика
    exportData.push(['Данные для графика калибровки']);
    exportData.push(['x0:', calculation.graphXY[0]["x"].toFixed(6)]);
    exportData.push(['y0:', calculation.graphXY[0]["y"].toFixed(6)]);
    exportData.push(['x1:', calculation.graphXY[1]["x"].toFixed(6)]);
    exportData.push(['y1:', calculation.graphXY[1]["y"].toFixed(6)]);
    
    // Создаем лист с данными
    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Добавляем данные графика на отдельный лист
    if (calculation.graphXY && calculation.graphXY.length >= 2) {
      const chartData = [
        ['X', 'Y'],
        [calculation.graphXY[0]["x"], calculation.graphXY[0]["y"]],
        [calculation.graphXY[1]["x"], calculation.graphXY[1]["y"]]
      ];
      
      const chartWs = XLSX.utils.aoa_to_sheet(chartData);
      XLSX.utils.book_append_sheet(wb, chartWs, "Данные графика");
      
      // Добавляем ссылку на график в основной лист
      const graphNote = [
        [],
        ['Примечание: График доступен на листе "Данные графика"'],
        ['Для построения графика в Excel:'],
        ['1. Выделите данные X и Y на листе "Данные графика"'],
        ['2. Вставьте график через меню "Вставка" -> "График"'],
        ['3. Выберите тип "Точечная с гладкими кривыми"']
      ];
      
      XLSX.utils.sheet_add_aoa(ws, graphNote, { origin: -1 });
    }
    
    // Добавляем форматирование
    if (!ws['!cols']) ws['!cols'] = [];
    ws['!cols'][0] = { wch: 30 }; // Ширина первого столбца
    ws['!cols'][1] = { wch: 20 }; // Ширина второго столбца
    
    // Добавляем лист в книгу
    XLSX.utils.book_append_sheet(wb, ws, "Расчет");
    
    // Генерируем файл
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Предлагаем пользователю сохранить файл
    saveAs(data, `Расчет_${calculation.id}_${calculation.ComponentName}.xlsx`);
  };

  return (
    <button 
      className="btn btn-success w-100 py-2"
      onClick={exportToExcel}
    >
      <i className="bi bi-file-excel me-2"></i>
      Экспорт в Excel
    </button>
  );
};

export default ExcelExportButton;