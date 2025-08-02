from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . views import DownoloadHelpPDF

router = DefaultRouter()
router.register(r'docum-user', DownoloadHelpPDF, basename='docum_user')

urlpatterns = [
    path('', include(router.urls))
    # path('docum_user/download-help-pdf/', DownoloadHelpPDF.as_view({'get': 'download_help_pdf'}), name='download_help_pdf'),
    # path('docum_user/download-security-policy/', DownoloadHelpPDF.as_view({'get': 'download_security_policy'}), name='download_security_policy'),
    # path('docum_user/download-security-policy/', DownoloadHelpPDF.as_view({'get': 'download_security_policy'})),
]
