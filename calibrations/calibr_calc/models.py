from django.db import models
from django.db.models import Avg
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

# Create your models here.
class Calculations(models.Model):
    ComponentName = models.CharField(max_length=255)
    UpLimitConcSubstance = models.FloatField()    
    CountDensities = models.IntegerField()
    # DateTime = models.DateTimeField(auto_now_add=True)
    DateTime = models.DateTimeField(blank=True, null=True)
    
    Device = models.CharField(max_length=255, blank=True, null=True)
    SolutionBasic = models.CharField(max_length=255, blank=True, null=True)
    SolutionWorking = models.CharField(max_length=255, blank=True, null=True)
    Walvelength = models.IntegerField(blank=True, null=True)
    Cuvete = models.IntegerField(blank=True, null=True)
    Method = models.CharField(max_length=255, blank=True, null=True)
    
    DateTimeChange = models.DateTimeField(blank=True, null=True)
    IdCreate = models.IntegerField(blank=True, null=True)
    IdChange = models.IntegerField(blank=True, null=True)
    ChangeOwner = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.id} | {self.ComponentName} |{self.DateTime} | {self.UpLimitConcSubstance} (CountDensities: {self.CountDensities})'
    
    # def save(self, *args, **kwargs):
    #     # при создании, когда нет pk
    #     if not self.pk:
    #         self.DateTimeChange = self.DateTime
    #     super().save(*args, **kwargs)

@receiver(pre_save, sender=Calculations)
def set_datetimes(sender, instance, **kwargs):
    if not instance.pk:
            now_date_time = timezone.now()
            instance.DateTime = now_date_time
            instance.DateTimeChange = now_date_time
    else:  # Обновление существующего
        if not instance.DateTimeChange:  # Если DateTimeChange не установлен
            instance.DateTimeChange = now_date_time

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