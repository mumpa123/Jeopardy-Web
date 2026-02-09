from django.contrib import admin
from django.urls import path, include, re_path
from .views import IndexView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")), 
    re_path(r"^.*$", IndexView.as_view(), name="index"),
]
