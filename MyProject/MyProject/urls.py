"""
URL configuration for MyProject project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from MyApp import views  # Thêm dòng này để import views từ MyApp

urlpatterns = [
    path('admin/', admin.site.urls),
    path('upload/', views.upload_csv, name='upload_csv'),  # Trang upload
    path('visualize/', views.visualize_data, name='visualize_data'),  # Trang trả về dữ liệu JSON
    path('index/', views.index, name='index'),  # Trang chính hiển thị biểu đồ
    path('', views.upload_csv, name='home')  # Cấu hình URL trang chủ là trang upload
]
