from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . views import CalculationsViewSet, SolutionsViewSet, OpticalDensitiesViewSet, GetCountDensitiesView, GetCountDensitiesIdView

router = DefaultRouter()
router.register(r'calculations', CalculationsViewSet)
router.register(r'solutions', SolutionsViewSet)
router.register(r'opticaldensities', OpticalDensitiesViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('calculations/<int:calculation_id>/count-densities-id', GetCountDensitiesIdView.as_view(), name='get-count-densities-id'),
    path('calculations/<int:calculation_id>/count-densities', GetCountDensitiesView.as_view(), name='get-count-densities'),
]