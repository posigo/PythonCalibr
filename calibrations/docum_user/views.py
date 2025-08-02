
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from urllib.parse import quote

import os

FILE_NAME_HELP = 'CalcCalibrHelp.pdf'
FILE_NAME_POLICY = 'SecurityPolicy.json'
FILE_NAME_ASUTP = 'asutp.json'

# class DownoloadHelpPDF(APIView):
#     permission_classes = [IsAuthenticated]
    
#     def get(self, request, *args, **kwargs):
#         print(f"static->{settings.STATIC_ROOT}")
#         file_path = os.path.join(settings.STATIC_ROOT, 'pdf', FILE_NAME_HELP)        
#         print(f"static->{file_path}")
#         if not os.path.exists(file_path):
#             return Response({'error': 'Файл не найден'})
#         with open(file_path, 'rb') as f:
#             encoded_name = quote(FILE_NAME_HELP)
#             response = HttpResponse(f.read(), content_type='application/pdf')
#             response['Content-Disposition'] = f'attachment; filename="{encoded_name}"; filename*=UTF-8\'\'{encoded_name}'
#             response['Access-Control-Expose-Headers'] = 'Content-Disposition'
#             return response        

#     @action(detail=False, methods=['get'], permission_classes=[AllowAny])
#     def download_security_policy(self, request, *args, **kwargs):
#         policy_file_path = os.path.join(settings.STATIC_ROOT, 'json', FILE_NAME_POLICY)
#         if not os.path.exists(policy_file_path):
#             return Response({'error': 'Файл политики безопасности не найден'}, status=status.HTTP_404_NOT_FOUND)
        
#         try:
#             with open(policy_file_path, r, encoding='utf-8') as f:
#                 policy_content = f.read()
#                 return Response(policy_content, content_type='application/json')
#         except Exception as e:            
#             return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DownoloadHelpPDF(ViewSet):
    
    # authentication_classes = []
    # permission_classes = [AllowAny]

    def _set_file_path(self, file_name, message_err):
        """Общий метод для установки пути файла"""
        file_path = os.path.join(settings.STATIC_ROOT, 'json', file_name)
        if not os.path.exists(file_path):
            return Response({'error': f'Файл {message_err} не найден'}, status=status.status.HTTP_404_NOT_FOUND)
        return file_path

    def _download_json_file(self, file_name, message_err):
        """Общий метод для скачивания JSON файлов"""
        file_path = self._set_file_path(file_name=file_name, message_err=message_err)        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()                
                return Response(content, content_type='application/json')
        except Exception as e:       
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    @action(
        detail=False, 
        methods=['get'], 
        permission_classes=[IsAuthenticated],
        url_path='download-help-pdf', 
        url_name='download_help_pdf'
        )
    def download_help_pdf(self, request, *args, **kwargs):
    # def get(self, request):
        print(f"static->{settings.STATIC_ROOT}")
        file_path = os.path.join(settings.STATIC_ROOT, 'pdf', FILE_NAME_HELP)        
        print(f"static->{file_path}")
        if not os.path.exists(file_path):
            return Response({'error': 'Файл не найден'})
        with open(file_path, 'rb') as f:
            encoded_name = quote(FILE_NAME_HELP)
            response = HttpResponse(f.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{encoded_name}"; filename*=UTF-8\'\'{encoded_name}'
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response        

    @action(
        detail=False, 
        methods=['get'], 
        permission_classes=[AllowAny], 
        url_path='download-security-policy', 
        url_name='download_security_policy'
    )
    def download_security_policy(self, request, *args, **kwargs):
        # policy_file_path = os.path.join(settings.STATIC_ROOT, 'json', FILE_NAME_POLICY)
        # if not os.path.exists(policy_file_path):
        #     return Response({'error': 'Файл политики безопасности не найден'}, status=status.HTTP_404_NOT_FOUND)
        
        # try:
        #     with open(policy_file_path, 'r', encoding='utf-8') as f:
        #         policy_content = f.read()
        #         return Response(policy_content, content_type='application/json')
        # except Exception as e:            
        #     return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return self._download_json_file(FILE_NAME_POLICY, 'политики безопасности')
        
    @action(
        detail=False, 
        methods=['get'], 
        permission_classes=[IsAuthenticated], 
        url_path='download-asutp', 
        url_name='download_asutp'
    )
    def download_asutp(self, request, *args, **kwargs):
        # asutp_file_path = os.path.join(settings.STATIC_ROOT, 'json', FILE_NAME_ASUTP)
        # if not os.path.exists(asutp_file_path):
        #     return Response({'error': 'Файл asutp не найден'}, status=status.HTTP_404_NOT_FOUND)
        
        # try:
        #     with open(asutp_file_path, 'r', encoding='utf-8') as f:
        #         policy_content = f.read()
        #         return Response(policy_content, content_type='application/json')
        # except Exception as e:            
        #     return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return self._download_json_file(FILE_NAME_ASUTP, 'asutp')
    
