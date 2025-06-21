class WC:
    pass

class WP:
    def __init_subclass__(cls, **kwargs):
        raise TypeError(f'Class {cls.__name__} cannot be inhetited from.')
    # Количетсво знаков после запятой
    Number_After_Comma = 6
    # Символ для результата полного измерения
    #Char_For_Full_Measurement = '+/-'
    Char_For_Full_Measurement = '\u00B1'
    