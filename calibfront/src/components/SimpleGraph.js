const SimpleGraph = ({ graphXY, width=400, height= 300 }) => {
    // Масштабируем данные под размер графика
    const xValues = graphXY.map(p => p.x);
    const yValues = graphXY.map(p => p.y);  
    const xMax = Math.max(...xValues);
    const yMax = Math.max(...yValues);

    // Коэффициенты масштабирования
    const scaleX = width / xMax;
    const scaleY = height / yMax;

    // Преобразуем точки в формат для SVG polyline
    const points = graphXY
        .map(p => `${p.x * scaleX},${height - p.y * scaleY}`)
        .join(' ');

    // Функция для округления значений при отображении
    const formatLabel = (value) => Number(value).toFixed(6);

    return (
        <svg width={width} height={height} className="border">
            {/* Горизонтальная ось (X) */}
            <line 
                x1="0" 
                y1={height} 
                x2={width} 
                y2={height} 
                stroke="black" 
                strokeWidth="1.5"
            />
      
            {/* Вертикальная ось (Y) */}
            <line 
                x1="0" 
                y1="0" 
                x2="0" 
                y2={height} 
                stroke="black" 
                strokeWidth="1.5"
            />

            {/* Линия графика */}
            <polyline
                points={points}
                fill="none"
                stroke="blue"
                strokeWidth="2"
            />
      
            {/* Точки данных */}
            {graphXY.map((p, i) => (
                <g key={i}>
                    <circle
                        cx={p.x * scaleX}
                        cy={height - p.y * scaleY}
                        r="4"
                        fill="red"
                    />
                    {/* Подписи значений точек */}
                    <text
                        x={p.x * scaleX + 8}
                        y={height - p.y * scaleY - 8}
                        fontSize="10"
                        fill="#333"
                    >
                        ({formatLabel(p.x)}, {formatLabel(p.y)})
                    </text>
                </g>
            ))}

            {/* Подписи значений на оси X */}
            {graphXY.map((p, i) => (
                <text
                    key={`x-${i}`}
                    x={p.x * scaleX}
                    y={height + 15}
                    fontSize="10"
                    textAnchor="middle"
                    fill="#555"
                >
                    {formatLabel(p.x)}
                </text>
            ))}

            {/* Подписи значений на оси Y */}
            {graphXY.map((p, i) => (
                <text
                    key={`y-${i}`}
                    x={-25}
                    y={height - p.y * scaleY}
                    fontSize="10"
                    textAnchor="end"
                    fill="#555"
                >
                    {formatLabel(p.y)}
                </text>
            ))}

            {/* Подписи осей */}
            <text x={width - 20} y={height - 5} fontSize="12" fill="#333">X</text>
            <text x={10} y={15} fontSize="12" fill="#333">Y</text>
        </svg>
    );
};

export default SimpleGraph;