from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import m2m_changed, post_save, post_delete
from django.dispatch import receiver
# Get the currently active user model
User = get_user_model()

class TrainedModel(models.Model):
    name = models.CharField(max_length=255)
    model_file = models.BinaryField()
    encoder_file = models.BinaryField()
    csv_file = models.FileField(upload_to='training_data/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=False)
    precision = models.FloatField(null=True, blank=True)
    recall = models.FloatField(null=True, blank=True)
    f1_score = models.FloatField(null=True, blank=True)
    accuracy = models.FloatField(null=True, blank=True)
    validation_percentage = models.FloatField(null=True, blank=True)
    confusion_matrix = models.JSONField(null=True, blank=True)
    classification_report = models.JSONField(null=True, blank=True)
    previous_model = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='next_versions'
    )
    active_labels = models.ManyToManyField('Label', related_name='models', blank=True)

class UserPrediction(models.Model):
    model = models.ForeignKey(TrainedModel, on_delete=models.CASCADE)
    predicted_letter = models.CharField(max_length=255)
    target_letter = models.CharField(max_length=255)
    confidence_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='predictions'
    )

class Label(models.Model):
    name = models.CharField(max_length=256, unique=True)
    example_image = models.ImageField(upload_to='label_examples/', null=True, blank=True)

@receiver(m2m_changed, sender=TrainedModel.active_labels.through)
def delete_orphan_labels_on_m2m_change(sender, instance, action, reverse, model, pk_set, **kwargs):
    if action in ["post_remove", "post_clear"]:
        orphan_labels = Label.objects.filter(models=None)
        for label in orphan_labels:
            label.delete()

@receiver(post_delete, sender=TrainedModel)
def delete_orphan_labels_on_model_delete(sender, instance, **kwargs):
    orphan_labels = Label.objects.filter(models=None)
    for label in orphan_labels:
        label.delete()

# delete the file from /media/ when the label is deleted from the db
@receiver(post_delete, sender=Label)
def delete_label_image_file(sender, instance, **kwargs):
    if instance.example_image and instance.example_image.name:
        storage = instance.example_image.storage
        name = instance.example_image.name
        if storage.exists(name):
            storage.delete(name)

# delete the file from /media/ when the trained model is deleted from the db
@receiver(post_delete, sender=TrainedModel)
def delete_model_csv_file(sender, instance, **kwargs):
    if instance.csv_file and instance.csv_file.name:
        storage = instance.csv_file.storage
        name = instance.csv_file.name
        if storage.exists(name):
            storage.delete(name)