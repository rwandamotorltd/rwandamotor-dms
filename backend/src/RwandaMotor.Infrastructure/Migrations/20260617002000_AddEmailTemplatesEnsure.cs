using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    public partial class AddEmailTemplatesEnsure : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent fallback — runs even if the previous migration was skipped or
            // failed silently. Uses information_schema so it is safe to re-run.
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name   = 'CompanySettings'
                          AND column_name  = 'EmailJobCardMessage'
                    ) THEN
                        ALTER TABLE ""CompanySettings"" ADD COLUMN ""EmailJobCardMessage"" text;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name   = 'CompanySettings'
                          AND column_name  = 'EmailDeliveryNoteMessage'
                    ) THEN
                        ALTER TABLE ""CompanySettings"" ADD COLUMN ""EmailDeliveryNoteMessage"" text;
                    END IF;
                END $$;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""CompanySettings""
                    DROP COLUMN IF EXISTS ""EmailJobCardMessage"",
                    DROP COLUMN IF EXISTS ""EmailDeliveryNoteMessage"";
            ");
        }
    }
}
