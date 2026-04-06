from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("core", "0001_initial"),
        ("warranty", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Complaint",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True, verbose_name="created")),
                ("modified", models.DateTimeField(auto_now=True, verbose_name="modified")),
                ("phone_number", models.CharField(max_length=20)),
                ("customer_name", models.CharField(max_length=255)),
                ("subject", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("OPEN", "Open"), ("IN_PROGRESS", "In Progress"), ("RESOLVED", "Resolved"), ("CLOSED", "Closed")], default="OPEN", max_length=20)),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                ("closure_note", models.CharField(blank=True, max_length=500)),
                ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_complaints", to=settings.AUTH_USER_MODEL)),
                ("registration", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="complaints", to="warranty.warrantyregistration")),
            ],
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True, verbose_name="created")),
                ("modified", models.DateTimeField(auto_now=True, verbose_name="modified")),
                ("sender", models.CharField(choices=[("CUSTOMER", "Customer"), ("CS_AGENT", "CS Agent")], max_length=20)),
                ("text", models.TextField()),
                ("complaint", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="messages", to="complaints.complaint")),
            ],
        ),
        migrations.CreateModel(
            name="ComplaintImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created", models.DateTimeField(auto_now_add=True, verbose_name="created")),
                ("modified", models.DateTimeField(auto_now=True, verbose_name="modified")),
                ("complaint", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="complaints.complaint")),
                ("image", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="complaint_images", to="core.image")),
            ],
        ),
    ]
