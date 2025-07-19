import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ExcelExportButton = ({ calculation, uncertainty }) => {
  const exportToExcel = async () => {
    // Создаем новую рабочую книгу Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Spectrophotometer App';
    workbook.created = new Date();
    
    // Добавляем лист
    const worksheet = workbook.addWorksheet('Расчёт');

    // 1. Добавляем заголовок
    worksheet.mergeCells('A1:B1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Детали расчёта';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // 2. Добавляем основные данные расчета
    const details = [
      ['Компонент:', calculation.ComponentName],
      ['Предел верхней концентрации:', calculation.UpLimitConcSubstance],
      ['Дата расчёта:', new Date(calculation.DateTime).toLocaleString('ru-RU')],
      ['Прибор:', calculation.Device],
      ['Метод:', calculation.SolutionBasic],
      ['Базовый раствор:', calculation.BasicSolution],
      ['Рабочий раствор:', calculation.SolutionWorking],
      ['Длина волны:', calculation.Walvelength],
      ['Кювета:', calculation.UpLimitConcSubstance]
    ];

    details.forEach(([label, value], index) => {
      worksheet.getCell(`A${index + 3}`).value = label;
      worksheet.getCell(`B${index + 3}`).value = value;
    });

    // 3. Добавляем таблицу растворов
    let currentRow = details.length + 5;
    
    // Заголовок таблицы
    worksheet.getCell(`A${currentRow}`).value = 'Таблица растворов';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    // Заголовки столбцов
    const headers = [
      'Значение',
      ...Array.from({ length: calculation.CountDensities }, (_, i) => `ОптПлотн${i+1}`),
      'Абсолютная погрешность',
      'Относительная погрешность',
      'Complete Measurement Result'
    ];
    
    headers.forEach((header, colIndex) => {
      const cell = worksheet.getCell(currentRow, colIndex + 1);
      cell.value = header;
      cell.font = { bold: true };
    });
    currentRow++;

    // Данные таблицы
    calculation.calculation_solutions.forEach(solution => {
      const rowData = [
        solution.Value,
        ...solution.solution_optical_densities.map(od => od.Value.toFixed(3)),
        solution.error_absolute_optical_density?.toFixed(6) || 'N/A',
        solution.error_relative_optical_density?.toFixed(6) || 'N/A',
        solution.complete_measurement_result || 'N/A'
      ];
      
      rowData.forEach((value, colIndex) => {
        worksheet.getCell(currentRow, colIndex + 1).value = value;
      });
      currentRow++;
    });

    // 4. Добавляем результат
    currentRow += 2;
    worksheet.getCell(`A${currentRow}`).value = 'Результат:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    worksheet.getCell(`B${currentRow}`).value = calculation.Y_String;
    currentRow++;

    // 5. Добавляем неопределенность (если есть)
    if (uncertainty.value !== -9999.0) {
      currentRow += 2;
      worksheet.getCell(`A${currentRow}`).value = 'Неопределённость линейной градуировки:';
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      currentRow++;
      
      const uncertaintyData = [
        ['при значении вещества->', uncertainty.valueSubstance.toFixed(1)],
        ['при количестве измерений->', uncertainty.numberMeasure],
        ['неопределённость равна->', uncertainty.value.toFixed(1)]
      ];
      
      uncertaintyData.forEach(([label, value], index) => {
        worksheet.getCell(`A${currentRow + index}`).value = label;
        worksheet.getCell(`B${currentRow + index}`).value = value;
      });
      
      currentRow += uncertaintyData.length;
    }

    // 6. Добавляем данные для графика
    currentRow += 2;
    worksheet.getCell(`A${currentRow}`).value = 'Данные для графика калибровки:';
    worksheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;
    
    // Заголовки графика
    worksheet.getCell(`A${currentRow}`).value = 'x';
    worksheet.getCell(`B${currentRow}`).value = 'y';
    currentRow++;
    
    // Данные графика
    worksheet.getCell(`A${currentRow}`).value = calculation.graphXY[0]["x"];
    worksheet.getCell(`B${currentRow}`).value = calculation.graphXY[0]["y"];
    currentRow++;
    
    worksheet.getCell(`A${currentRow}`).value = calculation.graphXY[1]["x"];
    worksheet.getCell(`B${currentRow}`).value = calculation.graphXY[1]["y"];
    
    // 7. Добавляем диаграмму
    const chart = worksheet.addChart({
      type: 'scatter',
      title: 'График калибровки',
      render: 'chart',
    });

    chart.addSeries({
      name: 'Калибровка',
      marker: { symbol: 'circle', size: 8 },
      data: [
        { x: calculation.graphXY[0]["x"], y: calculation.graphXY[0]["y"] },
        { x: calculation.graphXY[1]["x"], y: calculation.graphXY[1]["y"] }
      ],
      trendline: {
        type: 'linear',
        displayEquation: true,
        displayRSquared: true,
      },
    });

    // Позиционируем диаграмму
    chart.setPosition(`A${currentRow + 3}`, 0, 0, 0);

    // Генерируем Excel файл
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `Расчет_${calculation.id}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <button 
      className="btn btn-success w-100 py-2"
      onClick={exportToExcel}
    >
      {/* <i className="bi bi-file-excel me-2"></i> */}
      <i className="bi bi-file-earmark-excel me-2"></i>
      Экспорт в Excel
    </button>
  );
};

export default ExcelExportButton;