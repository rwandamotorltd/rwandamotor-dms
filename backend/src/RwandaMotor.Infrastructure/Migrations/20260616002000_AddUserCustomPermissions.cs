using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RwandaMotor.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserCustomPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""AspNetUsers""
                ADD COLUMN IF NOT EXISTS ""CustomPermissions"" jsonb NOT NULL DEFAULT '[]'::jsonb;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""AspNetUsers"" DROP COLUMN IF EXISTS ""CustomPermissions"";
            ");
        }
    }
}
