from django.urls import path
from .views import ModelTrainView

# TODO: dead code?
urlpatterns = [
    path('train', ModelTrainView.as_view(), name='model-train'),
]