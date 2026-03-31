from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("CS_AGENT", "CS Agent"),
                    ("QUALITY_REVIEWER", "Quality Reviewer"),
                    ("ADMIN", "Admin"),
                ],
                max_length=20,
            ),
            preserve_default=False,
        ),
    ]
