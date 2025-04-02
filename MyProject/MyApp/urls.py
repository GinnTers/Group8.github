from django.urls import path
from . import views

urlpatterns = [
    path('upload/', views.upload_csv, name='upload_csv'),
    path('visualize/', views.visualize_data, name='visualize_data'),
    path('add_order/', views.add_order, name='add_order'),
    path('index/', views.index, name='index'),
    path('get-products/<str:group_code>/', views.get_products_by_group, name='get_products_by_group'),
]
