using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using RwandaMotor.Infrastructure.Persistence;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260617001000_AddEmailTemplates")]
    public partial class AddEmailTemplates : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""CompanySettings""
                    ADD COLUMN IF NOT EXISTS ""EmailJobCardMessage""      text NULL,
                    ADD COLUMN IF NOT EXISTS ""EmailDeliveryNoteMessage"" text NULL;
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
