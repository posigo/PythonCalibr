import numpy
from . serialisers import CalculationsSerializer

def get_uncertainty_linear_calibration(calculation:CalculationsSerializer, id:int, valueSubstance:float = 1.0, numberMeasure:float = 1.0):
        # print(calculation.data.get('Sy'))
        # Sy = calculation.data.get('Sy')
        # sum_mul_values_and_avr_od_solution = calculation.data.get('sum_mul_values_and_avr_od_solution')
        # sum_square_values_solution = calculation.data.get('sum_square_values_solution')
        CountDensities = calculation.data.get('CountDensities')
        # sample_size_solution = calculation.data.get('sample_size_solution')
        # average_solutions = calculation.data.get('average_solutions')
        # sum_values_solution = calculation.data.get('sum_values_solution')
        res = 0.0
        try:
                a01 = calculation._Sy / (calculation._sum_mul_values_and_avr_od_solution / calculation._sum_square_values_solution)
                a02 = 1 / numberMeasure
                a03_0 = CountDensities * calculation._sample_size_solution
                a03 = 1 / a03_0
                a04 = (valueSubstance - calculation._average_solutions) ** 2
                a05 = calculation._sum_square_values_solution - calculation._sum_values_solution ** 2 / calculation._sample_size_solution

                res = a01 * numpy.sqrt(a02 + a03 + (a04 / a05))
        # print(res)
        # return result
                res_unc = 0.0
        except Exception:
                res = 0.0

        result = dict()
        result['id'] = id
        result['valueSubstance'] = valueSubstance
        result['numberMeasure'] = numberMeasure
        result['uncertaintyLinearCalibration'] = res
        return result