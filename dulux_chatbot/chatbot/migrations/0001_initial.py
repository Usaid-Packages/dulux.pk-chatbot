from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ProcessedMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("message_id", models.CharField(max_length=100, unique=True)),
                ("processed_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="WhatsAppSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True, verbose_name="created")),
                ("modified", models.DateTimeField(auto_now=True, verbose_name="modified")),
                ("phone_number", models.CharField(max_length=20, unique=True)),
                ("flow", models.CharField(blank=True, choices=[("REGISTRATION", "Warranty Registration"), ("CLAIM", "Warranty Claim"), ("FIND_PRODUCT", "Find a Product"), ("COMPLAINT", "Raise a Complaint"), ("REISSUANCE", "Certificate Reissuance")], max_length=20, null=True)),
                ("current_step", models.CharField(default="menu", max_length=50)),
                ("session_data", models.JSONField(default=dict)),
                ("last_activity", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
