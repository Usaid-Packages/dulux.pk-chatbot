from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("warranty", "0005_alter_claimqualityreviewitem_required_item_and_more"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "ALTER TABLE warranty_warrantyregistration "
                        "ADD COLUMN IF NOT EXISTS province varchar(100) NOT NULL DEFAULT '';"
                    ),
                    reverse_sql=migrations.RunSQL.noop,
                ),
                migrations.RunSQL(
                    sql="UPDATE warranty_warrantyregistration SET province = '' WHERE province IS NULL;",
                    reverse_sql=migrations.RunSQL.noop,
                ),
                migrations.RunSQL(
                    sql="ALTER TABLE warranty_warrantyregistration ALTER COLUMN province SET DEFAULT '';",
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="warrantyregistration",
                    name="province",
                    field=models.CharField(blank=True, default="", max_length=100),
                ),
            ],
        ),
    ]
