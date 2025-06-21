//npm install chart.js react-chartjs-2
import React from 'react';
import { Line } from 'react-chartjs-2';  // Компонент для линейного графика
import {
    Chart as ChartJS,   // Основной класс Chart.js
    CategoryScale,      // Шкала для категорий (ось X)
    LinearScale,        // Линейная шкала (ось Y)
    PointElement,       // Элементы точек на графике
    LineElement,        // Элементы линий
    Title,              // Заголовок графика
    Tooltip,            // Всплывающие подсказки
    Legend              // Легенда графика
} from 'chart.js';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const GraphComponent = ({ graphXY }) => {
    // Подготовка данных для графика
    const chartData = {
        // Подписи оси X (преобразуем координаты x в строки)
        labels: graphXY.map(point => `X: ${point.x}`), 
        datasets: [
            {
                label: 'Калибровочный график',                      // Название в легенде
                data: graphXY.map(point => point.y),                // Данные для оси Y
                borderColor: 'rgb(75, 192, 192)',                // Цвет линии
                borderWidth: 3,  
                spanGaps: true,                                     // Игнорируем пропуски      
                backgroundColor: 'rgba(75, 192, 192, 0.5)',         // Цвет заливки
                tension: 0.1                                        // Плавность кривой (0 = прямые линии)
            }
        ]
    };
    // Настройки отображения графика
    const options = {
        responsive: true,                                       // Адаптивность под размер контейнера
        plugins: {
            legend: { display: false, position: 'top',  },     // Позиция легенды
            title: {
                display: true,
                text: 'График зависимости оптической плотности от концентрации'
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                border: {
                    display: true,
                    width: 2,
                    //color: 'black'
                },
                grid: {
                    //color: 'blue',
                    display: true,
                    drawTicks: true,
                    lineWidth: 1, //ширина лини  сетки
                    offset: false,
                    tickColor: 'red',
                    z: -100
                },
                title: {
                    display: true,                              // Ось Y начинается с 0
                    text: 'Оптическая плотность (Y)'            // Подпись оси Y
                },
                ticks: {
                    color: 'blue',
                    display: true,
                    padding: 5,
                },
            },
            x: {
                border: {
                    display: true,
                    width: 2,
                    //color: 'black'
                },
                grid: {  //сетка настройка промежуточный по x вертикали
                    //color: 'red',
                    display: true,
                    //drawTicks: true,  //на оси рисует линни (перескает)
                    lineWidth: 1, //ширина лини  сетки
                    offset: false,  //линии сетки смещены по границам метки
                    tickColor: 'blue',
                    //tickLength: 100,
                    //tickWidth:10,
                    z: 100
                },
                title: {
                    display: true,
                    text: 'Концентрация (X)'                    // Подпись оси X
                },
                ticks: {  //цифры и или напдписи шкалы
                    //backdropColor: 'black',
                    //backdropPadding: 10,
                    color: 'red',
                    display: true,
                    padding: 5,
                    //showLabelBackdrop: true,
                    //textStrokeColor: 'green',
                    //textStrokeWidth: 10,
                },
            },
        },        
    };

    // Рендер компонента Line с подготовленными данными и настройками
    return <Line data={chartData} options={options} />;
};

export default GraphComponent;