# Библиотека SciPy — это библиотека для языка Python, основанная на расширении NumPy, # 
# но для более глубоких и сложных научных вычислений, анализа данных и построения графиков. 
# SciPy в основном написана на Python и частично на языках C, C++ и Fortran, 
# поэтому отличается высокой производительностью и скоростью работы.
# pip install scipy
from scipy.stats import t
import numpy
import math
from rest_framework import serializers
from . models import OpticalDensities, Solutions, Calculations
from .utilities import WP

class OpticalDensitiesSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpticalDensities
        fields = ('__all__')
    
class SolutionsSerializer(serializers.ModelSerializer):
    OpticalDensities = OpticalDensitiesSerializer(many=True, read_only=True)    
    # Дополнительное поле: Количество оптических плотностей
    count_optical_density = serializers.SerializerMethodField(read_only=True)
    #count_optical_density = serializers.ReadOnlyField()
    # Дополнительное поле: проверка совпадения количества оптических плотностей со значением поля CountDensities
    is_optical_densities_match = serializers.SerializerMethodField(read_only=True)

    solution_optical_densities = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Cреднее арифметическое значение оптических плотностей
    average_optical_density = serializers.SerializerMethodField(read_only=True)
    #average_optical_density = serializers.ReadOnlyField()
    # Дополнительное поле: Значение стандартного отклонения оптических плотностей в растворе
    std_dev_optical_density = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Обратное распределение t-Стьюдента
    inverse_t_distribution = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Абсолютноя погрешность раствора
    error_absolute_optical_density = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Относительная погрешность раствора
    error_relative_optical_density = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Полный результат раствора
    complete_measurement_result = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Cкоректированное значение среднего значения плотности
    # average_corrected_optical_density = serializers.SerializerMethodField(read_only=True)
 
    class Meta:
        model = Solutions
        # fields = ['id', 'Calculation', 'CountDensities', 'Value', 'OpticalDensities', 'is_optical_densities_match', 'average_optical_density']
        fields = ('__all__')
        read_only_fields = ['is_optical_densities_match', 'average_optical_density']
    
    def get_fields(self):
        fields = super().get_fields()
        # Если это запрос списка (list action), возвращаем только нужные поля
        if hasattr(self.context.get('view'), 'action'):
            if self.context.get('view').action == 'list':
                return {
                    'id': fields['id'],
                    'Value': fields['Value'],
                    'CountDensities': fields['CountDensities'],
                    'Calculation': fields['Calculation'],                
                    'solution_optical_densities': fields['solution_optical_densities'],
                }
        # Для всех остальных запросов возвращаем все поля
        return fields

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # реализации доступа к полю CountDensitiesпри создании записи и запрета доступа при обновлении
        if self.context.get('request') and self.context['request'].method in ['PUT', 'PATCH']:
            self.fields['CountDensities'].read_only = True
    
    # Количество оптических плотностей
    def get_count_optical_density(self, obj):    
        self._count_optical_density = obj.optical_densities.count()
        return self._count_optical_density
        
    # проверка совпадения количества оптических плотностей со значением поля CountDensities
    def get_is_optical_densities_match(self, obj):        
        # Получаем количество связанных OpticalDensities        
        self._is_optical_densities_match = self._count_optical_density == obj.CountDensities
        # Сравниваем с CountDensities
        return self._is_optical_densities_match        

    # Cреднее арифметическое значение оптических плотностей
    def get_average_optical_density(self, obj):        
        # if self.get_is_optical_densities_match(obj) == False:
        #     return -9999
        if self._is_optical_densities_match == False:
            self._average_optical_density = -9999
        else:
            # Получаем все значения оптических плотностей
            optical_densities = obj.optical_densities.all()
            self._average_optical_density = 0.0
            if optical_densities.exists():
                # Вычисляем среднее арифметическое
                total = sum(od.Value for od in optical_densities)
                self._average_optical_density = total / len(optical_densities)                        
        return self._average_optical_density    
        return getattr(obj, 'avg_optical', 0)

    # Значение стандартного отклонения оптических плотностей в растворе
    def get_std_dev_optical_density(self, obj):
        if self._is_optical_densities_match == False:
            return -9999
        # avr = self._average_optical_density        
        # Получаем все значения оптических плотностей
        optical_densities = obj.optical_densities.all()
        self._std_dev_optical_density = 0.0
        if optical_densities.exists():
            # Получаем список значений оптических плотностей
            values = [od.Value for od in optical_densities]
            # Лямбда-функция для вычисления стандартного отклонения
            #std_dev = lambda values: math.sqrt(sum((x - avr) ** 2 for x in values) / len(values)) if values else 0
            #return std_dev(values)
            self._std_dev_optical_density = numpy.std(values)
        return self._std_dev_optical_density

    # Обратное распределение t-Стьюдента
    def get_inverse_t_distribution(self, obj):        
        sample = obj.Calculation.solutions.count()
        self._inverse_t_distribution = 0.0
        if sample-1 >0:
            # Параметры для вычисления обратного распределения t-Стьюдента
            alpha = 0.05  # Уровень значимости (вероятность отклонения гипотезы)
            df = sample-1  # Степени свободы
            # Вычисляем обратное распределение t-Стьюдента
            t_critical = t.ppf(1 - alpha / 2, df)
            #t_critical = t.ppf(alpha, df)
            self._inverse_t_distribution = t_critical
        return self._inverse_t_distribution
    
    # Абсолютноя погрешность раствора
    def get_error_absolute_optical_density(self,obj):        
        self._error_absolute_optical_density = 0.0
        if (self._count_optical_density == 0 or \
            self._is_optical_densities_match == False):
            self._error_absolute_optical_density = -9999
        else:
            self._error_absolute_optical_density = self._inverse_t_distribution * \
                (self._std_dev_optical_density / numpy.sqrt(obj.CountDensities))
        return self._error_absolute_optical_density
    
    #Относительная погрешность раствора
    def get_error_relative_optical_density(self,obj):
        self._error_relative_optical_density = 0.0
        if (self._count_optical_density == 0 or \
            self._is_optical_densities_match == False):
            self._error_relative_optical_density = -9999
        else:
            self._error_relative_optical_density = (self._error_absolute_optical_density / self._average_optical_density) * 100.0
        return self._error_relative_optical_density
    
    # Полный результат раствора
    def get_complete_measurement_result(self, obj):
        self._complete_measurement_result = ''
        result = f'a={round(self._average_optical_density, WP.Number_After_Comma)}'
        # result += '+/-'
        result += WP.Char_For_Full_Measurement
        result +=f'{round(self._error_absolute_optical_density, WP.Number_After_Comma)}'
        self._complete_measurement_result = result
        return result
            
    def get_solution_optical_densities(self, obj):
        ods = obj.optical_densities.all()
        return OpticalDensitiesSerializer(ods, many=True).data       

    # Cкоректированное значение среднего значения плотности
    # def get_average_corrected_optical_density(self, obj):
        # calculation_data = self.context.get('calculation_data')
        # print(f'calculation_data -> {calculation_data}')
        # a_value = self.context.get('additional_a', '0')
        # print(f'a = {a_value}')
    #    return 1

    # def validate(self, value):
    #     """
    #     Валидация для проверки, можно ли изменять поле CountDensities.
    #     """
    #     if self.instance and 'CountDensities' in self.initial_data:
    #         # Если это обновление (instance существует) и передано поле CountDensities
    #         # raise serializers.ValidationError({
    #         #     "CountDensities": "Это поле нельзя изменять после создания записи."
    #         # })
    #         raise serializers.ValidationError(
    #             "Это поле нельзя изменять после создания записи."
    #         )
    #     return data

    # def create(self, validated_data):
    #     """
    #     Создание записи с полем CountDensities.
    #     """
    #     return Solutions.objects.create(**validated_data)

    # def update(self, instance, validated_data):
    #     """
    #     Обновление записи без изменения поля CountDensities.
    #     """
    #     # Удаляем CountDensities из validated_data, если оно передано
    #     validated_data.pop('CountDensities', None)
    #     return super().update(instance, validated_data)

class CalculationsSerializer(serializers.ModelSerializer):
    # Solutions = SolutionsSerializer(many=True, read_only=True, context={'calculation_data': 'some_data'})
    Solutions = SolutionsSerializer(many=True, read_only=True)
    # Дополнительное поле: Размер выборки (количество растворов в расчёте)
    sample_size_solution = serializers.SerializerMethodField(read_only=True) 
    # Дополнительное поле: проверка совпадения количества оптических плотностей растворов со значением поля CountDensities
    is_soutions_match = serializers.SerializerMethodField(read_only=True)   

    calculation_solutions = serializers.SerializerMethodField(read_only=True)   
    # Дополнительное поле: Сумма значений растворов
    sum_values_solution = serializers.SerializerMethodField(read_only=True)    
    # Дополнительное поле: Сумма квадратов значений растворов
    sum_square_values_solution = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Сумма средних значений оптических плотностей растворов
    sum_avr_od_values_solution = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Сумма произведений значений растворов и средних значений плотностей растворов
    sum_mul_values_and_avr_od_solution = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Среднее значение растворов
    average_solutions = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: a
    a = serializers.SerializerMethodField(read_only=True)
    #a_for_solutions = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: b
    b = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Список скоректированных значений среднего значения плотности в растворах
    list_avr_corrected_od_solution = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Sy
    Sy = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Sa
    Sa = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: T распределение стьюдента
    t_distribution = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Y Значение расчёта
    Y_Value = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Y Значение расчёта ввиде строки
    Y_String = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Координаты графика
    graphXY = serializers.SerializerMethodField(read_only=True)
    # Дополнительное поле: Неопределённость линейной градуировки 
    # uncertainty_linear_calibration = serializers.SerializerMethodField(read_only=True)
    sde = serializers.SerializerMethodField()

    class Meta:
        model = Calculations
        # fields = ['id', 'ComponentName', 'Device', 'SolutionBasic', 'SolutionWorking', 'Walvelength', 'Cuvete', 'DateTime', 'UpLimitConcSubstance', 'CountDensities', 'Solutions']        
        fields = ('__all__')
        extra_kwargs = {
            'Device': {'required': False, 'allow_null': True},
            'SolutionBasic': {'required': False, 'allow_null': True},
            'SolutionWorking': {'required': False, 'allow_null': True},
            'Walvelength': {'required': False, 'allow_null': True},
            'Cuvete': {'required': False, 'allow_null': True},            
            'IdChange': {'required': False, 'allow_null': True},
            'DateTimeChange': {'required': False, 'allow_null': True},
            'IdCreate': {'read_only': True},
            'DateTime': {'read_only': True},
        }
    
    def get_fields(self):
        fields = super().get_fields()
        # Если это запрос списка (list action), возвращаем только нужные поля
        if self.context.get('view').action == 'list':
            return {
                'id': fields['id'],
                'ComponentName': fields['ComponentName'],
                'DateTime': fields['DateTime'],
                'UpLimitConcSubstance': fields['UpLimitConcSubstance'],
                'CountDensities': fields['CountDensities'],
                'IdChange': fields['IdChange']
            }
        # Для всех остальных запросов возвращаем все поля
        return fields

    # def to_representation(self, instance):
    #     # Получаем стандартное представление объекта
    #     representation = super().to_representation(instance)
        
    #     # Если в контексте указано, что нужно вернуть только CountDensities
    #     if self.context.get('only_count_densities', True):
    #         return {"CountDensities": representation["CountDensities"]}
        

    #     # Иначе возвращаем все поля
    #     return representation
    
    # Размер выборки (количество растворов в расчёте)
    def get_sample_size_solution(self, obj):
        self._sample_size_solution = obj.solutions.count()
        return self._sample_size_solution
    
    # Проверка совпадения количества оптических плотностей растворов со значением поля CountDensities
    def get_is_soutions_match(self, obj):
        # solutions = obj.solutions.count()
        self._is_soutions_match = {
            'optical_densities': True,
            'solutions': True
        }
        values_is = list()
        values_count = list()
        for solution in obj.solutions.all():
            values_is.append(SolutionsSerializer(solution).data.get('is_optical_densities_match', 0))
            values_count.append(solution.CountDensities)        
        if False in values_is:
            self._is_soutions_match['optical_densities'] = False
        else:
            if (len(values_count) == 0):
                self._is_soutions_match['solutions'] = False
            else:
                if (sum(count for count in values_count) / len(values_count)) != obj.CountDensities:
                    self._is_soutions_match['solutions'] = False
        return self._is_soutions_match

    # Сумма значений растворов
    def get_sum_values_solution(self, obj):
        self._sum_values_solution = 0
        if self._is_soutions_match['solutions'] == False:
            self._sum_values_solution = -9999
        else:
            # Получаем все значения оптических плотностей
            solutions = obj.solutions.all()        
            if solutions.exists():
                # Получаем список значений оптических плотностей
                values = [solution.Value for solution in solutions]
                # Лямбда-функция для вычисления стандартного отклонения
                sum_sol = lambda values: sum(x for x in values) if values else 0
                self._sum_values_solution = sum_sol(values)
        return self._sum_values_solution
    
    # Сумма квадратов значений растворов
    def get_sum_square_values_solution(self, obj):
        self._sum_square_values_solution = 0
        if self._is_soutions_match['solutions'] == False:
            self._sum_square_values_solution = -9999
        else:
            solutions = obj.solutions.all()        
            if solutions.exists():
                # Получаем список значений оптических плотностей
                values = [solution.Value for solution in solutions]
                # Лямбда-функция для вычисления стандартного отклонения
                sum_sol = lambda values: sum(x ** 2 for x in values) if values else 0
                self._sum_square_values_solution = sum_sol(values)
        return self._sum_square_values_solution
    
    # Сумма средних значений оптических плотностей растворов
    def get_sum_avr_od_values_solution(self, obj):
        self._sum_avr_od_values_solution = 0.0
        if self._is_soutions_match['optical_densities'] == False:
            self._sum_avr_od_values_solution = -9999
        else:            
            # Получаем все записи растворов
            solutions = obj.solutions.all()
            if solutions.exists():
                # Используем SolutionsSerializer для получения average_optical_density
                average_values = [
                    SolutionsSerializer(solution).data.get('average_optical_density') 
                    for solution in solutions
                ]            
                self._sum_avr_od_values_solution = sum(average_values)
        return self._sum_avr_od_values_solution
    
    # Сумма произведений значений растворов и средних значений плотностей растворов
    def get_sum_mul_values_and_avr_od_solution(self, obj):
        self._sum_mul_values_and_avr_od_solution = 0.0
        if self._is_soutions_match['optical_densities'] == False or \
            self._is_soutions_match['solutions'] == False:
            self._sum_mul_values_and_avr_od_solution = -9999
        else:
            # Получаем все записи растворов
            solutions = obj.solutions.all()
            if solutions.exists():            
                # 1. через списки
                values_and_averages = [
                    (solution.Value, SolutionsSerializer(solution).data.get('average_optical_density', 0))
                    for solution in obj.solutions.all()
                ]
            # print(f'values_and_averages = {values_and_averages}')
            # if any(avg == -9999 for _, avg in values_and_averages):
            #     # print(f'values_and_averages -> {values_and_averages}')
            #     return -9999            
            # Вычисляем сумму произведений
            total_sum2 = sum(value * avg for value, avg in values_and_averages)            
            # print(f'values_and_averages -> {values_and_averages} | total_sum2 = {total_sum2}')
            self._sum_mul_values_and_avr_od_solution = total_sum2
                    
            # 2. через словарь
            # data_val_avr = {
            #     solution.id: {
            #         'value': solution.Value,
            #         'average_optical_density': SolutionsSerializer(solution).data.get('average_optical_density', 0)
            #     } for solution in obj.solutions.all()
            # }           
            # lst_err = [item['average_optical_density'] for item in data_val_avr.values()]            
            # #Вычисляем сумму произведений
            # total_sum3 = sum(item['value'] * item['average_optical_density']
            #                     for item in data_val_avr.values()
            #                 )
            # print(f'data_val_avr -> {data_val_avr} | total_sum3 = {total_sum3}')
            # if -9999 in lst_err: 
            #     return -9999
            # else:
            #     return total_sum3

            # в ручную
            # total_sum4 = 0
            # for solution in obj.solutions.all():
            #     optical_densities = solution.optical_densities.all()
            #     if optical_densities.exists():
            #         avg = sum(od.Value for od in optical_densities) / len(optical_densities)                    
            #     else:                    
            #         avg = 0
            #     print(f'avg = {avg}')
            #     total_sum4 += solution.Value * avg
            # print(f'total_sum4 = {total_sum4}')
            # return total_sum4
        
            # total_sum = 0
            # for solution in solutions:
            #     # Используем SolutionsSerializer для получения average_optical_density                
            #     avr_od_solution = SolutionsSerializer(solution).data.get('average_optical_density')
            #     print(f'value, avr_od_solution -> {[solution.Value, avr_od_solution]}')
            #     if avr_od_solution == -9999:
            #         return -9999
            #     # print(f'value = {solution.Value} avr = {avr_od_solution}')
            #     # Вычисляем произведение и добавляем к общей сумме                                            
            #     total_sum += solution.Value * avr_od_solution                
            # print(f'total_sum = {total_sum}')
            # return total_sum           
            
        return self._sum_mul_values_and_avr_od_solution
    
    # Среднее значение растворов
    def get_average_solutions(self, obj):
        self._average_solutions = 0.0
        if self._is_soutions_match['solutions'] == False:
            self._average_solutions = -9999
        else:
            solutions = obj.solutions.all()
            if solutions.exists():
                # Вычисляем среднее арифметическое
                total = sum(solution.Value for solution in solutions)
                self._average_solutions = total / len(solutions)
        return self._average_solutions
    
    # a
    def get_a(self, obj):
        self._a = 0.0
        if False in self._is_soutions_match.values():
            self._a = -9999
        try:            
            tmp1 = self._sum_square_values_solution * self._sum_avr_od_values_solution
            tmp2 = self._sum_values_solution * self._sum_mul_values_and_avr_od_solution
            tmp3 = tmp1 - tmp2
            tmp4 = self._sample_size_solution * self._sum_square_values_solution
            tmp5 = self._sum_values_solution ** 2
            tmp6 = tmp4 - tmp5
            self._a = (tmp3/tmp6)
        except Exception:
            self._a -9999
        return self._a
        
    # b
    def get_b(self, obj):
        self._b = 0.0
        if False in self._is_soutions_match.values():
            self._b = -9999
        try:
            tmp1 = self._sample_size_solution * self._sum_mul_values_and_avr_od_solution
            tmp2 = self._sum_values_solution * self._sum_avr_od_values_solution
            tmp3 = tmp1 - tmp2
            tmp4 = self._sample_size_solution * self._sum_square_values_solution
            tmp5 = self._sum_values_solution ** 2
            tmp6 = tmp4 - tmp5
            self._b = tmp3/tmp6
        except Exception:
            self._b = -9999
        return self._b
    
    # Список скоректированных значений среднего значения плотности в растворах
    def get_list_avr_corrected_od_solution(self, obj):
        self._list_avr_corrected_od_solution = list()
        solutions = obj.solutions.all()
        correct_avr_od_solutions = list()
        for solution in solutions:
            dict_corr_avr_od = {}
            dict_corr_avr_od['id'] = solution.id    
            dict_corr_avr_od['average_optical_density'] = SolutionsSerializer(solution).data.get('average_optical_density', 0)        
            dict_corr_avr_od['avr_corrected_od_solution'] = self.get_a(obj) + self.get_b(obj) * solution.Value \
                                if dict_corr_avr_od['average_optical_density'] != -9999 else -9999
            correct_avr_od_solutions.append(dict_corr_avr_od)
        self._list_avr_corrected_od_solution = correct_avr_od_solutions
        return correct_avr_od_solutions
        
    # Sy
    def get_Sy(self, obj):
        self._Sy = 0.0
        if False in self._is_soutions_match.values() or self._sample_size_solution <= 2:
            self._Sy = -9999
        else:
            # solutions = obj.solutions.all()
            list_correct_avr = self._list_avr_corrected_od_solution
            tmp1 = sum ((correct_avr['average_optical_density'] - correct_avr['avr_corrected_od_solution']) ** 2 \
                    for correct_avr in list_correct_avr)
            self._Sy = numpy.sqrt(tmp1/(self._sample_size_solution - 2))
        # print(f'list_correct_avr -> {list_correct_avr}')
        # print(f'tmp1 = {tmp1} | tmp2 {tmp2}')

        return self._Sy

    # Sa
    def get_Sa(self, obj):
        self._Sa = 0.0
        if self._is_soutions_match['solutions'] == False:
            self._Sa = -9999
        else:
            try:
                tmp1 = self._sample_size_solution * self._sum_square_values_solution
                tmp2 = tmp1 - self._sum_values_solution ** 2
                tmp3 = (self._sum_square_values_solution/tmp2) ** (0.5)
                self._Sa = (self._Sy * tmp3)
            except Exception:
                self._Sa = -9999
        return self._Sa

    # T распределение стьюдента    
    def get_t_distribution(self, obj):                
        self._t_distribution = 0.0
        df = self._sample_size_solution - 2
        if (df > 0):
            x = numpy.abs(self._a) / self._Sa
            one_sided_distibution = t.cdf(x, df)
            two_sided_distibution = 2 * t.cdf(x, df)
            pdf = t.pdf(x, df)
            #rvs = t.rvs(df, df)
            res_str = f'x = {x} | df = {df} | '
            res_str += f'cdf = ({one_sided_distibution} | {two_sided_distibution}) | '
            res_str += f'pdf = {pdf} | '
            #rint(res_str)
            #res_str += f'rvs = {rvs}'
            #return res_str
            self._t_distribution = two_sided_distibution
        else: self._t_distribution = 0.0
        return self._t_distribution

    # Y Значение расчёта
    def get_Y_Value(self, obj):
        self._Y_Value = 0.0
        #print(f'test --- {self.T_Distribution.get_value()}')
        #print(f'test --- {self.T_Distribution} {self.sum_mul_values_and_avr_od_solution} {self.sum_square_values_solution}')
        #print(f'test --- {self.sum_mul_values_and_avr_od_solution / self.sum_square_values_solution}')
        if self._t_distribution > 0.05:
            self._Y_Value = self._sum_mul_values_and_avr_od_solution / self._sum_square_values_solution
        else:
            self._Y_Value = -9999
        return self._Y_Value

    # Y Значение расчёта ввиде строки
    def get_Y_String(self, obj):
        self._Y_String = ''
        if self._t_distribution > 0.05:
            res_str = f'Y={round(self._Y_Value, WP.Number_After_Comma)} X'
            self._Y_String = res_str
        else: self._Y_String = 'Check the set of measurement conditions!'
        return self._Y_String         

    # Координаты графика
    def get_graphXY(self, obj):        
        res_list= list()
        res_list.append({'x': 0.0,'y': 0.0})
        res_list.append(
            {
                'x': float(obj.UpLimitConcSubstance),
                'y': round(self._Y_Value * obj.UpLimitConcSubstance, WP.Number_After_Comma)
            }
        )        
        return res_list
    
    def get_calculation_solutions(self, obj):
        sols = obj.solutions.all()
        return SolutionsSerializer(sols, many=True).data

    # Неопределённость линейной градуировки 
    def get_uncertainty_linear_calibration(self, obj, valueSubstance:float = 1.0, numberMeasure:float = 1.0):
        a01 = self.get_Sy(obj) / (self.get_sum_mul_values_and_avr_od_solution(obj) / self.get_sum_square_values_solution(obj))
        a02 = 1 / numberMeasure
        a03_0 = obj.CountDensities * self.get_sample_size_solution(obj)
        a03 = 1 / a03_0
        a04 = (valueSubstance - self.get_average_solutions(obj)) ** 2
        a05 = self.get_sum_square_values_solution(obj) - self.get_sum_values_solution(obj) ** 2 /  self.get_sample_size_solution(obj)

        result = a01 * numpy.sqrt(a02 + a03 + (a04 / a05))
        return result
            
    def get_sde(self, obj):
        return 0
    
    def create(self, validated_data):
        # get user from query context
        request = self.context.get('request')
        user = request.user if request else None
        if user is None:
            raise serializers.ValidationError(
                {"detail": "Authentication credentials were not provided."},
                code='not_authentification'
            )
        # set value IdCreate and IdChange
        validated_data['IdCreate'] = user.id
        validated_data['IdChange'] = user.id

        # set DateTimeChange
        isinstance = super().create(validated_data)
        
        return isinstance
    
    def update(self, instance, validated_data):
        # get user from query context
        request = self.context.get('request')
        user = request.user if request else None
        if user is None:
            raise serializers.ValidationError(
                {"detail": "Authentication credentials were not provided."},
                code='not_authentification'
            )
        
        if validated_data.get('ChangeOwner', False):
            # print(f"ChangeOwner->{validated_data.get('ChangeOwner', False)}") 
            # print(f"validated_data['IdCreate']->{instance.IdCreate}")
            # print(f"user.id->{user.id}")
            # print(f"user->{(user.groups.all())}")
            is_not_admin = (user.username != "admin" 
                and not user.groups.filter(name='admins').exists())
            is_not_owner = instance.IdCreate != user.id

            if is_not_admin and is_not_owner:
                raise serializers.ValidationError({
                    'detail': 'Only the owner has the right to change'
            })

        # blocked edit DateTime и IdCreate
        if 'DateTime' in validated_data:
            del validated_data['DateTime']
        if 'IdCreate' in validated_data:
            del validated_data['IdCreate']

        # set IdChange
        validated_data['IdChange'] = user.id

        # Проверяем, что DateTimeChange не меньше DateTime
        if 'DateTimeChange' in validated_data:
            new_datetime_change = validated_data['DateTimeChange']
            if new_datetime_change < instance.DateTime:
                raise serializers.ValidationError({
                    'DateTimeChange': 'DateTimeChange cannot be earlier than DateTime'
                })
        return super().update(instance, validated_data)

# User = get_user_model()

from .services.user_service import get_usernames

class CalculationsUserListSerializer(CalculationsSerializer):
    Username = serializers.SerializerMethodField()

    class Meta:
        model = Calculations
        fields = ['id', 'ComponentName', 'DateTime', 'UpLimitConcSubstance', 'CountDensities', 'IdChange', 'Username']    

    def get_Username(self, obj):
        # собрать все IdChange
        if not hasattr(self, '_user_map'):
            queryset = self.context.get('queryset', [])
            user_ids = [o.IdChange for o in queryset if o.IdChange]
            self._user_map = get_usernames(user_ids)
    
        return self._user_map.get(obj.IdChange)