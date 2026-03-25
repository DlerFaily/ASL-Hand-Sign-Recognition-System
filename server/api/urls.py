from rest_framework import routers
from django.urls import path, include
from api.test.views import TestView
from api.models.views import (
    predictGesture,
    getAllModels,
    trainNewModel,
    retrainModelById,
    selectModelById,
    deleteModelById,
    getActiveModel,
    getCurrentActiveLabels,
    getAllLabels,
    uploadLabelImage,
    getLabelById,
    evaluateModelOnCSV
)
from api.user.views import signup, getStats, is_staff

router = routers.DefaultRouter()
#add class views
router.register(r'test', TestView, basename='test')

#add function based views
urlpatterns = router.urls + [
    path('signup/', signup, name='signup'),
    path('users/stats/', getStats, name='user-stats'),
    path('users/is_staff', is_staff, name='is_staff'),
    path('models/predict/', predictGesture, name='prediction'),
    path('models/train/', trainNewModel, name='train'),
    path('models/', getAllModels, name='get-all-models'),
    path('models/<int:model_id>/retrain/', retrainModelById, name='retrain'),
    path('models/<int:model_id>/select/', selectModelById, name='select-model'),
    path('models/<int:model_id>/', deleteModelById, name='delete-model'),
    path('models/status/', getActiveModel, name='active-model'),
    path('models/active-labels/', getCurrentActiveLabels, name="active-labels"), # don't use this one, it is to be deleted at the end, use getAllLabels with query active=true
    path('models/labels/', getAllLabels, name="all-labels"),
    path('models/labels/<int:label_id>/upload-image/', uploadLabelImage, name="upload-label-image"),
    path('models/labels/<int:label_id>/', getLabelById, name='get_label_by_id'),
    path('models/evaluate-csv/', evaluateModelOnCSV, name='evaluate-csv'),
]
