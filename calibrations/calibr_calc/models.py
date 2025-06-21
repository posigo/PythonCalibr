from django.db import models
from django.db.models import Avg

# Create your models here.
class Calculations(models.Model):
    ComponentName = models.CharField(max_length=255)
    Device = models.CharField(max_length=255)
    SolutionBasic = models.CharField(max_length=255)
    SolutionWorking = models.CharField(max_length=255)
    Walvelength = models.IntegerField()
    Cuvete = models.IntegerField()
    DateTime = models.DateTimeField(auto_now_add=True)
    UpLimitConcSubstance = models.FloatField()
    CountDensities = models.IntegerField()

    def __str__(self):
        return f'{self.id} | {self.ComponentName} |{self.DateTime} | {self.UpLimitConcSubstance} (CountDensities: {self.CountDensities})'

class SolutionsQuerySet(models.QuerySet):
    def with_avg_optical(self):
        return self.annotate(
            avg_optical=Avg('optical_densities__Value')
        )

class Solutions(models.Model):
    Calculation = models.ForeignKey(Calculations, on_delete=models.CASCADE, related_name='solutions')
    CountDensities = models.IntegerField()
    Value = models.FloatField()

    objects = SolutionsQuerySet.as_manager()

    # Дополнительное поле: Количество оптических плотностей
    @property
    def count_optical_density(self):
        ods = self.optical_densities.all()
        return ods.count()
    
    # Дополнительное поле: Cреднее арифметическое значение оптических плотностей
    def average_optical_density(self):
        ods = self.optical_densities.all()
        return sum(od.Value for od in ods)/ods.count()

    def __str__(self):
        return f'{self.id} | {self.Calculation.id} |{self.Value} (CountDensities: {self.CountDensities})'

class OpticalDensities(models.Model):
    Solution = models.ForeignKey(Solutions, on_delete=models.CASCADE, related_name='optical_densities')
    Value = models.FloatField()

    def __str__(self):
        return f'{self.id} | {self.Solution.id} ({self.Solution.Calculation.id}) | {self.Value}'