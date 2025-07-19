from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils.encoding import escape_uri_path
from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from openpyxl import Workbook
from openpyxl.drawing.image import Image
from openpyxl.chart import ScatterChart, Reference, Series
from openpyxl.styles import Font
import io
from datetime import datetime
from . models import Calculations, Solutions, OpticalDensities
from . serialisers import CalculationsSerializer, CalculationsUserListSerializer, SolutionsSerializer, OpticalDensitiesSerializer
from . uncertainty_lc import get_uncertainty_linear_calibration
from . permissions import IsSuperUser, IsAdmin, IsExtUser, IsUser

# Create your views here.
class CalculationsViewSet(viewsets.ModelViewSet):
    #queryset = Calculations.objects.all()
    queryset = Calculations.objects.prefetch_related(
        Prefetch('solutions', queryset=Solutions.objects.prefetch_related('optical_densities'))
    ).all()
    serializer_class = CalculationsSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'uncertainty', 'export_to_excel', 'calculationsusers']:
            # Просмотр разрешен всем аутентифицированным пользователям
            permission_classes = [IsUser | IsSuperUser | IsAdmin | IsExtUser]
        else:
            # Создание, удаление, редактирование - только для superuser, admin и extuser
            permission_classes = [IsSuperUser | IsAdmin | IsExtUser]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        # Определяем какой сериализатор использовать
        if self.action == 'calculationsusers':
            return CalculationsUserListSerializer
        return super().get_serializer_class()

    @action(detail=False, methods=['get'])
    def calculationsusers(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Передаем передаем queryset в контекст сериализатора
        serializer = self.get_serializer(
            queryset,
            many=True,
            context={
                'request': request,
                'queryset': queryset,  # передаем для оптимизации
                'view': self
            }
        )
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(serializer.data)
            
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='uncertainty')
    def uncertainty(self, request, *args, **kwargs):
        # Валидация valueSubstance
        valueSubstance = request.query_params.get('valueSubstance')
        if valueSubstance is None:
            raise ValidationError("Параметр valueSubstance обязателен.")
        try:
            valueSubstance = float(valueSubstance)
        except (TypeError, ValueError):
            raise ValidationError("Параметр valueSubstance должен быть числом.")

        # Валидация numberMeasure
        numberMeasure = request.query_params.get('numberMeasure')
        if numberMeasure is None:
            raise ValidationError("Параметр numberMeasure обязателен.")
        try:
            numberMeasure = int(numberMeasure)
        except (TypeError, ValueError):
            raise ValidationError("Параметр numberMeasure должен быть целым числом.")

        # Получаем объект Calculations и сериализуем его
        calculation_instance = self.get_object()
        calculation_serializer = self.get_serializer(calculation_instance)

        # Вызываем метод get_uncertainty_linear_calibration
        result = get_uncertainty_linear_calibration(calculation_serializer, calculation_instance.id, valueSubstance, numberMeasure)

        # Возвращаем результат
        return Response(result)

    @action(detail=True, methods=['get'], url_path='export/(?P<export_type>[^/.]+)')
    def export_to_excel(self, request, pk=None, export_type=None):
        if export_type != 'xls':
            return Response({"error": "Invalid export type"}, status=status.HTTP_400_BAD_REQUEST)

        # Получаем объект расчета
        calculation = self.get_object()
        serializer = self.get_serializer(calculation)
        
        # Проверяем параметры для uncertainty
        value_substance = request.query_params.get('valueSubstance')
        number_measure = request.query_params.get('numberMeasure')
        uncertainty = None
        
        # print(f'value_substance-{value_substance}')
        # print(f'number_measure-{number_measure}')

        if value_substance and number_measure:
            try:
                value_substance = float(value_substance)
                number_measure = int(number_measure)
                
                # Вычисляем uncertainty
                uncertainty_result = get_uncertainty_linear_calibration(
                    serializer, 
                    calculation.id, 
                    value_substance, 
                    number_measure
                )
                print(f"uncertainty_result->{uncertainty_result}")
                uncertainty = uncertainty_result.get('uncertaintyLinearCalibration')
            except (TypeError, ValueError):
                pass

        # Создаем Excel файл
        wb = Workbook()
        ws = wb.active
        ws.title = "Calculation Details"

        # Заполняем данные
        row_num = 1
        ws.cell(row=row_num, column=1, value=f"Расчет и построение градуировочного графика для определения {calculation.ComponentName}").font = Font(bold=True)
        row_num += 2
        
        # Основная информация
        ws.cell(row=row_num, column=3, value="Дата расчёта:").font = Font(bold=True)
        formatted_date = calculation.DateTime.strftime("%d.%m.%Y %H:%M")
        ws.cell(row=row_num, column=4, value=formatted_date)        
        row_num += 1
        ws.cell(row=row_num, column=3, value="Методика:")
        ws.cell(row=row_num, column=4, value=f"МВИ...")
        
        ws.cell(row=row_num, column=3, value="Предел верхней концентрации:").font = Font(bold=True)
        ws.cell(row=row_num, column=4, value=calculation.UpLimitConcSubstance)
        row_num += 1
        
        ws.cell(row=row_num, column=3, value="Прибор:").font = Font(bold=True)
        ws.cell(row=row_num, column=4, value=calculation.Device)
        row_num += 1
        
        ws.cell(row=row_num, column=3, value="Базовый раствор:").font = Font(bold=True)
        ws.cell(row=row_num, column=4, value=calculation.SolutionBasic)
        row_num += 1
        
        ws.cell(row=row_num, column=3, value="Рабочий раствор:").font = Font(bold=True)
        ws.cell(row=row_num, column=4, value=calculation.SolutionWorking)
        row_num += 1
        
        ws.cell(row=row_num, column=3, value="Длина волны:").font = Font(bold=True)
        ws.cell(row=row_num, column=4, value=calculation.Walvelength)
        row_num += 1
        
        ws.cell(row=row_num, column=3, value="Кювета:").font = Font(bold=True)
        ws.cell(row=row_num, column=4, value=calculation.Cuvete)
        row_num += 2
        
        # Таблица растворов
        ws.cell(row=row_num, column=1, value="Таблица растворов").font = Font(bold=True)
        row_num += 1
        
        # Заголовки таблицы
        # headers = ["ID", "Концентрация", "Кол-во плотностей", "Средняя плотность"]
        headers =["Станд. растворы"]
        for dens in range(calculation.CountDensities):
            headers.append(f"Опт. плот.{dens}")
        headers.append("Абс. погр.")
        headers.append("Отн. погр.")
        headers.append("Полный результат измерения")
        for col_num, header in enumerate(headers, 1):
            ws.cell(row=row_num, column=col_num, value=header).font = Font(bold=True)
        row_num += 1
        
        # Данные растворов
        for solution in calculation.solutions.all():
            solution_data = SolutionsSerializer(solution).data
            ws.cell(row=row_num, column=1, value=solution.Value)
            col = 2
            optical_densities = solution.optical_densities.all()
            serializer_optical_densities = OpticalDensitiesSerializer(optical_densities, many=True)
            optical_densities_data = serializer_optical_densities.data
            # print("solution_data.get----")
            # print(optical_densities_data)
            for density in optical_densities_data:
                ws.cell(row=row_num, column=col, value=density['Value'])
                col = col + 1            
            ws.cell(row=row_num, column=col, value=solution_data.get('error_absolute_optical_density'))
            col = col + 1
            ws.cell(row=row_num, column=col, value=solution_data.get('error_relative_optical_density'))
            col = col + 1
            ws.cell(row=row_num, column=col, value=solution_data.get('complete_measurement_result', 0))
            row_num += 1
        
        row_num += 1
        
        # Результат
        ws.cell(row=row_num, column=3, value="Результат:").font = Font(bold=True)
        ws.cell(row=row_num, column=4, value=serializer.data.get('Y_String', ''))
        row_num += 2

        # Неопределенность, если вычисляли
        print(f'uncertainty-{uncertainty}')
        if uncertainty is not None:
            ws.cell(row=row_num, column=1, value="Неопределённость линейной градуировки").font = Font(bold=True)
            row_num += 1
            ws.cell(row=row_num, column=1, value=f"при значении вещества={value_substance}")
            row_num += 1
            ws.cell(row=row_num, column=1, value=f"при количестве измерений={number_measure}")
            row_num += 1
            ws.cell(row=row_num, column=1, value=f"неопределённость равна={uncertainty}")
            row_num += 2
        
        # График калибровки
        chart_data = serializer.data.get('graphXY', [])
        if len(chart_data) >= 2:
            # Добавляем данные для графика
            ws.cell(row=row_num, column=1, value="График калибровки").font = Font(bold=True)
            start_data_row = row_num + 3 
            row_num += 1            
            
            # Записываем данные точек
            ws.cell(row=row_num, column=1, value="X")
            ws.cell(row=row_num, column=2, value="Y")
            row_num += 1
            
            for point in chart_data:
                ws.cell(row=row_num, column=1, value=point['x'])
                ws.cell(row=row_num, column=2, value=point['y'])
                row_num += 1
            
              # Скрываем строки с данными
            # for row in range(start_data_row - 2, row_num):  # -1 чтобы скрыть и заголовки
            #     ws.row_dimensions[row].hidden = True

            # Создаем точечную диаграмму
            chart = ScatterChart()
            chart.title = "График калибровки"
            chart.x_axis.title = "Концентрация"
            chart.y_axis.title = "Оптическая плотность"
            
            x_values = Reference(ws, min_col=1, min_row=row_num-len(chart_data), max_row=row_num-1)
            y_values = Reference(ws, min_col=2, min_row=row_num-len(chart_data), max_row=row_num-1)
            
            series = Series(y_values, x_values, title="Калибровка")
            chart.series.append(series)
            
            # Добавляем диаграмму на лист
            ws.add_chart(chart, f"A{row_num-3}")
        try:
            # Сохраняем файл в буфер
            buffer = io.BytesIO()
            wb.save(buffer)
            buffer.seek(0)

            # Возвращаем файл как ответ
            # response = Response(buffer.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            # response['Content-Disposition'] = f'attachment; filename=calculation_{calculation.id}_details.xlsx'
            # return response
            now_time = datetime.now()
            formatted_time = now_time.strftime('%Y%m%d_%H%M')
            print(f"formatted_time {formatted_time}")
            print(f"calculation.ComponentName {calculation.id}")
            file_name=f'calculation_{calculation.ComponentName}_{formatted_time}.xlsx'
            print(f"file_name {file_name}")
            response = HttpResponse(
                buffer.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f"attachment; filename*=UTF-8''{escape_uri_path(file_name)}"
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SolutionsViewSet(viewsets.ModelViewSet):
    #queryset = Solutions.objects.all()
    queryset = Solutions.objects.prefetch_related('optical_densities').all()
    serializer_class = SolutionsSerializer
    permission_classes = [IsSuperUser | IsAdmin | IsExtUser]

    @action(detail=False, methods=['get'], url_path='by-calculation/(?P<calculation_id>\d+)')
    def by_calculation(self, reqest, calculation_id=None):
        solutions = self.queryset.filter(Calculation_id=calculation_id)
        serializer = self.get_serializer(solutions, many=True)
        return Response(serializer.data)

    # print(f'queryset->{queryset}')
class OpticalDensitiesViewSet(viewsets.ModelViewSet):
    queryset = OpticalDensities.objects.all()
    serializer_class = OpticalDensitiesSerializer
    permission_classes = [IsSuperUser | IsAdmin | IsExtUser]
class GetCountDensitiesIdView(APIView):
    permission_classes = [IsSuperUser | IsAdmin]
    def get(self, request, calculation_id):
        try:
            calculation = Calculations.objects.get(id=calculation_id)
        except Calculations.DoesNotExist:
            return Response({"error": "Calculation not found"}, status=status.HTTP_404_NOT_FOUND)

        # Возвращаем значение CountDensities
        response_data = {
            "calculation_id": calculation.id,
            "CountDensities": calculation.CountDensities
        }
        return Response(response_data, status=status.HTTP_200_OK)
class GetCountDensitiesView(APIView):
    permission_classes = [IsSuperUser | IsAdmin]
    def get(self, request, calculation_id):
        try:
            calculation = Calculations.objects.get(id=calculation_id)
        except Calculations.DoesNotExist:
            return Response({"error": "Calculation not found"}, status=status.HTTP_404_NOT_FOUND)

        # Используем существующий сериализатор
        serializer = CalculationsSerializer(calculation)

        # Возвращаем только поле CountDensities
        response_data = {
            "CountDensities": serializer.data["CountDensities"]
        }
        return Response(response_data, status=status.HTTP_200_OK)

        #serializer = CalculationsSerializer(calculation, context={'only_count_densities': True})
        return Response(serializer.data, status=status.HTTP_200_OK)
