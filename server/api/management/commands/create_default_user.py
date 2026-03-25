from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = "Create a default user if not exists"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", "admin@admin.com", "iLoveAI1234")
            self.stdout.write(self.style.SUCCESS("Default admin user created."))
        else:
            self.stdout.write("Default admin user already exists.")